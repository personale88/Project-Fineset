// @vitest-environment jsdom
import { describe, expect, it, vi, beforeAll, afterAll, afterEach, beforeEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { content } from "@/content/en";
import { AdminPortalProvider } from "@/components/admin/AdminPortalContext";
import { AdminAutomationCenter } from "@/components/admin/AdminAutomationCenter";
import { AutomationCenterLoadingShell } from "@/components/admin/automation/AutomationCenterLoadingShell";
import { AutomationCenterErrorShell } from "@/components/admin/automation/AutomationCenterErrorShell";
import { DEFAULT_PLATFORM_AUTOMATION_CONFIG } from "@/lib/automation/default-config";
import { DEFAULT_PLATFORM_SETTINGS } from "@/lib/platform/default-settings";
import { PlatformSettingsProvider } from "@/components/admin/PlatformSettingsProvider";
import { AUTOMATION_COUNTRY_CODE_MESSAGE } from "@/lib/automation/country-code";
import { AUTOMATION_TIME_FORMAT_MESSAGE } from "@/lib/utils/time-input";
import { formatDateTimeInTimezone } from "@/lib/automation/timezone";
import { seedAutomationRunHistoryCache } from "@/lib/automation/runs-query";
import { AUTOMATION_CONFIG_SCOPES } from "@/lib/utils/automation-scope-url";
import {
  AUTOMATION_CENTER_NAV_CLASS,
  AUTOMATION_CENTER_ROOT_CLASS,
  AUTOMATION_MOBILE_FULL_WIDTH_BUTTON_CLASS,
} from "@/lib/automation/automation-center-layout";
import { AUTOMATION_SCOPE_PANEL_ID } from "@/lib/automation/scope-tabs-a11y";
import type { AutomationRunLogDto } from "@/lib/automation/types";
import { ApiError } from "@/types";
import * as automationApi from "@/lib/api/automation";
import * as toastModule from "@/hooks/useToast";

const sampleHistoryRun: AutomationRunLogDto = {
  id: "run-history-1",
  trigger: "DRY_RUN",
  status: "SUCCESS",
  startedAt: "2026-06-01T10:00:00.000Z",
  completedAt: "2026-06-01T10:00:05.000Z",
  summary: {
    invoicesSent: 1,
    invoicesSkipped: 0,
    paymentRemindersSent: 0,
    whatsAppQueued: 0,
    followUpsScheduled: 0,
    renewalRemindersSent: 0,
    expiryWarningsSent: 0,
    monthlyReportsSent: 0,
    paymentConfirmationsSent: 0,
    details: [],
  },
  errors: null,
  triggeredByEmail: "master-admin@test.local",
};

const navigationMocks = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  searchParams: new URLSearchParams(""),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/dashboard/automation",
  useSearchParams: () => navigationMocks.searchParams,
  useRouter: () => ({
    push: navigationMocks.push,
    replace: navigationMocks.replace,
  }),
}));

vi.mock("@/lib/auth/client-session-guard", () => ({
  isUnauthorizedApiError: (error: unknown) =>
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    (error as { status: number }).status === 401,
  redirectToSignInAfterUnauthorized: vi.fn(),
}));

const defaultPlatformSettingsResponse = {
  settings: DEFAULT_PLATFORM_SETTINGS,
  meta: {
    updatedAt: null,
    updatedByEmail: null,
    integrations: {
      smtp: { configured: false, host: null },
      whatsapp: { configured: false, mode: "deep_links" as const },
      redis: { configured: false },
      gemini: { configured: false },
      paymentProvider: { provider: "upi", configured: true },
      cron: { secretConfigured: false },
      database: { connected: true },
      impersonationEnvDefault: false,
    },
  },
};

let platformSettingsResponse = structuredClone(defaultPlatformSettingsResponse);

const server = setupServer(
  http.get("/api/admin/automation/config", () =>
    HttpResponse.json(DEFAULT_PLATFORM_AUTOMATION_CONFIG),
  ),
  http.get("/api/admin/settings", () => HttpResponse.json(platformSettingsResponse)),
  http.patch("/api/admin/automation/config", async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      ...DEFAULT_PLATFORM_AUTOMATION_CONFIG,
      ...(typeof body === "object" && body !== null ? body : {}),
    });
  }),
  http.get("/api/admin/automation/runs", () =>
    HttpResponse.json({ runs: [], total: 0 }),
  ),
);

beforeAll(() => server.listen());
afterEach(() => {
  cleanup();
  server.resetHandlers();
  navigationMocks.push.mockReset();
  navigationMocks.replace.mockReset();
  navigationMocks.searchParams = new URLSearchParams("");
  platformSettingsResponse = structuredClone(defaultPlatformSettingsResponse);
});
afterAll(() => server.close());

function buildAutomationCenterTree(
  queryClient: QueryClient,
  role: "MASTER_ADMIN" | "PLATFORM_ADMIN" = "MASTER_ADMIN",
  platformSettings = DEFAULT_PLATFORM_SETTINGS,
) {
  return (
    <QueryClientProvider client={queryClient}>
      <PlatformSettingsProvider settings={platformSettings}>
        <AdminPortalProvider
          role={role}
          permissions={{
            billing: true,
            portfolio: true,
            accounts: true,
            analytics: true,
          }}
        >
          <AdminAutomationCenter admin={content.admin} />
        </AdminPortalProvider>
      </PlatformSettingsProvider>
    </QueryClientProvider>
  );
}

function renderAutomationCenter(
  queryClient?: QueryClient,
  role: "MASTER_ADMIN" | "PLATFORM_ADMIN" = "MASTER_ADMIN",
  platformSettings = DEFAULT_PLATFORM_SETTINGS,
) {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: {
      href: "http://localhost:3000/admin/dashboard/automation",
      pathname: "/admin/dashboard/automation",
      search: "",
      origin: "http://localhost:3000",
      assign: vi.fn(),
    },
  });

  const client =
    queryClient ??
    new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

  return {
    queryClient: client,
    ...render(buildAutomationCenterTree(client, role, platformSettings)),
  };
}

async function openAutomationRunNowConfirm(
  user: ReturnType<typeof userEvent.setup>,
) {
  await user.click(screen.getByTestId("automation-run-now"));
  await waitFor(() => {
    expect(screen.getByTestId("automation-run-now-dialog")).toBeInTheDocument();
  });
}

async function confirmAutomationLiveRun(user: ReturnType<typeof userEvent.setup>) {
  await openAutomationRunNowConfirm(user);
  await user.click(screen.getByTestId("automation-run-now-confirm"));
}

describe("AutomationCenterLoadingShell", () => {
  it("renders page chrome, spinner, and loading label", () => {
    render(
      <AutomationCenterLoadingShell
        admin={content.admin}
        loadingLabel={content.admin.automation.loading}
      />,
    );

    expect(screen.getByTestId("automation-center-loading")).toHaveAttribute("aria-busy", "true");
    expect(
      screen.getByRole("heading", { name: /automation center/i, level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText(content.admin.automation.loading)).toBeInTheDocument();
    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });
});

describe("AutomationCenterErrorShell", () => {
  it("renders page header and retry banner", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    render(
      <AutomationCenterErrorShell
        admin={content.admin}
        message={content.admin.automation.loadFailed}
        retryLabel={content.admin.automation.retry}
        onRetry={onRetry}
      />,
    );

    const errorShell = screen.getByTestId("automation-center-error");
    expect(errorShell).toBeInTheDocument();
    expect(
      within(errorShell).getByRole("heading", { name: /automation center/i, level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("automation-config-error-banner")).toHaveTextContent(
      content.admin.automation.loadFailed,
    );

    await user.click(screen.getByRole("button", { name: content.admin.automation.retry }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe("AdminAutomationCenter config load failures", () => {
  it("shows the error shell when the config API fails on initial load", async () => {
    server.use(
      http.get("/api/admin/automation/config", () =>
        HttpResponse.json({ message: "Server error" }, { status: 500 }),
      ),
    );

    renderAutomationCenter();

    await waitFor(() => {
      expect(screen.getByTestId("automation-center-error")).toBeInTheDocument();
    });
    expect(
      screen.getByRole("heading", { name: /automation center/i, level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("automation-config-error-banner")).toHaveTextContent(
      content.admin.automation.loadFailed,
    );
    expect(screen.getByRole("button", { name: content.admin.automation.retry })).toBeEnabled();
  });

  it("shows the error shell when the config request fails with a network error", async () => {
    server.use(
      http.get("/api/admin/automation/config", () => HttpResponse.error()),
    );

    renderAutomationCenter();

    await waitFor(() => {
      expect(screen.getByTestId("automation-center-error")).toBeInTheDocument();
    });
    expect(screen.getByTestId("automation-config-error-banner")).toHaveTextContent(
      content.admin.automation.loadFailed,
    );
    expect(screen.getByRole("button", { name: content.admin.automation.retry })).toBeEnabled();
  });

  it("recovers after retry when the initial config load failed with a network error", async () => {
    const user = userEvent.setup();
    let configNetworkError = true;

    server.use(
      http.get("/api/admin/automation/config", () => {
        if (configNetworkError) {
          return HttpResponse.error();
        }
        return HttpResponse.json(DEFAULT_PLATFORM_AUTOMATION_CONFIG);
      }),
    );

    renderAutomationCenter();

    await waitFor(() => {
      expect(screen.getByTestId("automation-center-error")).toBeInTheDocument();
    });

    configNetworkError = false;
    await user.click(screen.getByRole("button", { name: content.admin.automation.retry }));

    await waitFor(() => {
      expect(screen.queryByTestId("automation-center-error")).not.toBeInTheDocument();
    });
    expect(screen.getByTestId("automation-run-preview")).toBeInTheDocument();
    expect(screen.queryByTestId("automation-config-error-banner")).not.toBeInTheDocument();
  });

  it("shows the error banner when a refetch fails with cached config data", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(
      ["admin", "automation", "config"],
      DEFAULT_PLATFORM_AUTOMATION_CONFIG,
    );

    renderAutomationCenter(queryClient);

    await waitFor(() => {
      expect(screen.getByTestId("automation-run-preview")).toBeInTheDocument();
    });

    server.use(
      http.get("/api/admin/automation/config", () =>
        HttpResponse.json({ message: "Server error" }, { status: 500 }),
      ),
    );

    await queryClient.invalidateQueries({ queryKey: ["admin", "automation", "config"] });

    await waitFor(() => {
      expect(screen.getByTestId("automation-config-error-banner")).toBeInTheDocument();
    });
    expect(screen.getByTestId("automation-run-preview")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: content.admin.automation.retry })).toBeEnabled();
  });

  it("recovers after retry when a background config refetch failed", async () => {
    const user = userEvent.setup();
    let configFetchFails = true;

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(
      ["admin", "automation", "config"],
      DEFAULT_PLATFORM_AUTOMATION_CONFIG,
    );
    seedAutomationRunHistoryCache(queryClient, [{ runs: [], total: 0 }]);

    renderAutomationCenter(queryClient);

    await waitFor(() => {
      expect(screen.getByTestId("automation-run-preview")).toBeInTheDocument();
    });

    server.use(
      http.get("/api/admin/automation/config", () => {
        if (configFetchFails) {
          return HttpResponse.error();
        }
        return HttpResponse.json(DEFAULT_PLATFORM_AUTOMATION_CONFIG);
      }),
    );

    await queryClient.invalidateQueries({ queryKey: ["admin", "automation", "config"] });

    await waitFor(() => {
      expect(screen.getByTestId("automation-config-error-banner")).toBeInTheDocument();
    });

    configFetchFails = false;
    await user.click(screen.getByRole("button", { name: content.admin.automation.retry }));

    await waitFor(() => {
      expect(screen.queryByTestId("automation-config-error-banner")).not.toBeInTheDocument();
    });
    expect(screen.getByTestId("automation-run-preview")).toBeInTheDocument();
  });

  it("keeps the config load error banner visible when switching away from Overview", async () => {
    const user = userEvent.setup();
    const configFetchFails = true;

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(
      ["admin", "automation", "config"],
      DEFAULT_PLATFORM_AUTOMATION_CONFIG,
    );
    seedAutomationRunHistoryCache(queryClient, [{ runs: [], total: 0 }]);

    renderAutomationCenter(queryClient);

    await waitFor(() => {
      expect(screen.getByTestId("automation-run-preview")).toBeInTheDocument();
    });

    server.use(
      http.get("/api/admin/automation/config", () => {
        if (configFetchFails) {
          return HttpResponse.error();
        }
        return HttpResponse.json(DEFAULT_PLATFORM_AUTOMATION_CONFIG);
      }),
    );

    await queryClient.invalidateQueries({ queryKey: ["admin", "automation", "config"] });

    await waitFor(() => {
      expect(screen.getByTestId("automation-config-error-banner")).toBeInTheDocument();
    });

    await user.click(
      screen.getAllByRole("tab", { name: content.admin.automation.scope.invoices })[0]!,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: content.admin.automation.scope.invoices }),
      ).toBeInTheDocument();
    });
    expect(screen.getByTestId("automation-config-error-banner")).toBeInTheDocument();
    expect(screen.getByTestId("automation-config-error-banner")).toHaveTextContent(
      content.admin.automation.loadFailed,
    );
  });

  it("keeps the config load error banner visible when switching between config tabs", async () => {
    const user = userEvent.setup();
    navigationMocks.searchParams = new URLSearchParams("scope=invoices");

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(
      ["admin", "automation", "config"],
      DEFAULT_PLATFORM_AUTOMATION_CONFIG,
    );
    seedAutomationRunHistoryCache(queryClient, [{ runs: [], total: 0 }]);

    renderAutomationCenter(queryClient);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: content.admin.automation.scope.invoices }),
      ).toBeInTheDocument();
    });

    server.use(
      http.get("/api/admin/automation/config", () => HttpResponse.error()),
    );

    await queryClient.invalidateQueries({ queryKey: ["admin", "automation", "config"] });

    await waitFor(() => {
      expect(screen.getByTestId("automation-config-error-banner")).toBeInTheDocument();
    });

    await user.click(
      screen.getAllByRole("tab", { name: content.admin.automation.scope.paymentReminders })[0]!,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          name: content.admin.automation.scope.paymentReminders,
        }),
      ).toBeInTheDocument();
    });
    expect(screen.getByTestId("automation-config-error-banner")).toBeInTheDocument();
  });

  it("keeps the config load error banner after cache writes that would clear the query error", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(
      ["admin", "automation", "config"],
      DEFAULT_PLATFORM_AUTOMATION_CONFIG,
    );
    seedAutomationRunHistoryCache(queryClient, [{ runs: [], total: 0 }]);

    renderAutomationCenter(queryClient);

    await waitFor(() => {
      expect(screen.getByTestId("automation-run-preview")).toBeInTheDocument();
    });

    server.use(
      http.get("/api/admin/automation/config", () => HttpResponse.error()),
    );

    await queryClient.invalidateQueries({ queryKey: ["admin", "automation", "config"] });

    await waitFor(() => {
      expect(screen.getByTestId("automation-config-error-banner")).toBeInTheDocument();
    });

    queryClient.setQueryData(
      ["admin", "automation", "config"],
      DEFAULT_PLATFORM_AUTOMATION_CONFIG,
    );

    await waitFor(() => {
      expect(screen.getByTestId("automation-config-error-banner")).toBeInTheDocument();
    });
  });
});

describe("AdminAutomationCenter scope URL", () => {
  it("opens the scope from ?scope= on initial load", async () => {
    navigationMocks.searchParams = new URLSearchParams("scope=billingCycle");

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(
      ["admin", "automation", "config"],
      DEFAULT_PLATFORM_AUTOMATION_CONFIG,
    );
    seedAutomationRunHistoryCache(queryClient, [{ runs: [], total: 0 }]);

    renderAutomationCenter(queryClient);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: content.admin.automation.scope.billingCycle }),
      ).toBeInTheDocument();
    });
  });

  it("updates the URL when changing scope tabs", async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(
      ["admin", "automation", "config"],
      DEFAULT_PLATFORM_AUTOMATION_CONFIG,
    );
    seedAutomationRunHistoryCache(queryClient, [{ runs: [], total: 0 }]);

    renderAutomationCenter(queryClient);

    await waitFor(() => {
      expect(screen.getByTestId("automation-run-preview")).toBeInTheDocument();
    });

    await user.click(
      screen.getAllByRole("tab", { name: content.admin.automation.scope.billingCycle })[0]!,
    );

    expect(navigationMocks.push).toHaveBeenCalledWith(
      "/admin/dashboard/automation?scope=billingCycle",
      { scroll: false },
    );
    expect(navigationMocks.replace).not.toHaveBeenCalled();
  });

  it("does not push history when re-selecting the active scope tab", async () => {
    navigationMocks.searchParams = new URLSearchParams("scope=billingCycle");
    const user = userEvent.setup();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(
      ["admin", "automation", "config"],
      DEFAULT_PLATFORM_AUTOMATION_CONFIG,
    );
    seedAutomationRunHistoryCache(queryClient, [{ runs: [], total: 0 }]);

    renderAutomationCenter(queryClient);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: content.admin.automation.scope.billingCycle }),
      ).toBeInTheDocument();
    });

    await user.click(
      screen.getAllByRole("tab", { name: content.admin.automation.scope.billingCycle })[0]!,
    );

    expect(navigationMocks.push).not.toHaveBeenCalled();
    expect(navigationMocks.replace).not.toHaveBeenCalled();
  });

  it("syncs the active tab when searchParams change via browser history", async () => {
    navigationMocks.searchParams = new URLSearchParams("scope=billingCycle");
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(
      ["admin", "automation", "config"],
      DEFAULT_PLATFORM_AUTOMATION_CONFIG,
    );
    seedAutomationRunHistoryCache(queryClient, [{ runs: [], total: 0 }]);

    const view = renderAutomationCenter(queryClient);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: content.admin.automation.scope.billingCycle }),
      ).toBeInTheDocument();
    });

    navigationMocks.searchParams = new URLSearchParams("scope=invoices");
    view.rerender(buildAutomationCenterTree(queryClient));

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: content.admin.automation.scope.invoices }),
      ).toBeInTheDocument();
    });

    navigationMocks.searchParams = new URLSearchParams("");
    view.rerender(buildAutomationCenterTree(queryClient));

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: content.admin.automation.scope.overview }),
      ).toBeInTheDocument();
    });
  });
});

describe("AdminAutomationCenter scope tabpanel", () => {
  it("exposes the active scope content in an ARIA tabpanel linked from scope tabs", async () => {
    navigationMocks.searchParams = new URLSearchParams("scope=billingCycle");

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(
      ["admin", "automation", "config"],
      DEFAULT_PLATFORM_AUTOMATION_CONFIG,
    );
    seedAutomationRunHistoryCache(queryClient, [{ runs: [], total: 0 }]);

    renderAutomationCenter(queryClient);

    await waitFor(() => {
      expect(screen.getByRole("tabpanel")).toBeInTheDocument();
    });

    const panel = screen.getByRole("tabpanel");
    expect(panel).toHaveAttribute("id", AUTOMATION_SCOPE_PANEL_ID);
    expect(panel).toHaveAttribute(
      "aria-label",
      content.admin.automation.scope.billingCycle,
    );

    const mobileScroll = screen.getByTestId("automation-scope-scroll");
    expect(
      within(mobileScroll).getByRole("tab", {
        name: content.admin.automation.scope.billingCycle,
      }),
    ).toHaveAttribute("aria-controls", AUTOMATION_SCOPE_PANEL_ID);
  });
});

describe("AdminAutomationCenter billing cycle number fields", () => {
  function seedAutomationQueryClient() {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(
      ["admin", "automation", "config"],
      DEFAULT_PLATFORM_AUTOMATION_CONFIG,
    );
    seedAutomationRunHistoryCache(queryClient, [{ runs: [], total: 0 }]);
    return queryClient;
  }

  async function openBillingCycleTab(user: ReturnType<typeof userEvent.setup>) {
    renderAutomationCenter(seedAutomationQueryClient());

    const billingCycleLabel = content.admin.automation.scope.billingCycle;

    if (navigationMocks.searchParams.get("scope") !== "billingCycle") {
      await waitFor(() => {
        expect(screen.getByTestId("automation-run-preview")).toBeInTheDocument();
      });
      await user.click(screen.getAllByRole("tab", { name: billingCycleLabel })[0]!);
    }

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: billingCycleLabel })).toBeInTheDocument();
    });
  }

  it.each([
    {
      label: content.admin.automation.fields.cycleStartDay,
      defaultValue: DEFAULT_PLATFORM_AUTOMATION_CONFIG.billingCycle.cycleStartDay,
      min: 1,
    },
    {
      label: content.admin.automation.fields.paymentDueDay,
      defaultValue: DEFAULT_PLATFORM_AUTOMATION_CONFIG.billingCycle.paymentDueDay,
      min: 1,
    },
    {
      label: content.admin.automation.fields.gracePeriodDays,
      defaultValue: DEFAULT_PLATFORM_AUTOMATION_CONFIG.billingCycle.gracePeriodDays,
      min: 1,
    },
  ])(
    "resets $label to min when cleared",
    async ({ label, defaultValue, min }) => {
      const user = userEvent.setup();
      navigationMocks.searchParams = new URLSearchParams("scope=billingCycle");
      await openBillingCycleTab(user);

      const input = screen.getByLabelText(label);
      expect(input).toHaveValue(defaultValue);

      fireEvent.change(input, { target: { value: "" } });
      expect(input).toHaveValue(min);

      fireEvent.blur(input);
      expect(input).toHaveValue(min);
    },
  );

  it("saves billing cycle min values after a field is cleared", async () => {
    const user = userEvent.setup();
    const updateSpy = vi.spyOn(automationApi, "updateAutomationConfig").mockResolvedValue({
      ...DEFAULT_PLATFORM_AUTOMATION_CONFIG,
      billingCycle: {
        cycleStartDay: 1,
        paymentDueDay: 1,
        gracePeriodDays: 10,
      },
    });

    navigationMocks.searchParams = new URLSearchParams("scope=billingCycle");
    await openBillingCycleTab(user);

    const paymentDueInput = screen.getByLabelText(
      content.admin.automation.fields.paymentDueDay,
    );
    fireEvent.change(paymentDueInput, { target: { value: "" } });
    expect(paymentDueInput).toHaveValue(1);

    await user.click(screen.getByRole("button", { name: content.admin.automation.save }));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith({
        billingCycle: {
          ...DEFAULT_PLATFORM_AUTOMATION_CONFIG.billingCycle,
          paymentDueDay: 1,
        },
      });
    });

    updateSpy.mockRestore();
  });
});

describe("AdminAutomationCenter payment reminders max reminders field", () => {
  const maxRemindersRangeError = content.admin.automation.validation.numberRange
    .replace("{min}", "1")
    .replace("{max}", "20");

  function seedAutomationQueryClient(
    config: typeof DEFAULT_PLATFORM_AUTOMATION_CONFIG = DEFAULT_PLATFORM_AUTOMATION_CONFIG,
  ) {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(["admin", "automation", "config"], config);
    seedAutomationRunHistoryCache(queryClient, [{ runs: [], total: 0 }]);
    return queryClient;
  }

  async function openPaymentRemindersTab() {
    renderAutomationCenter(seedAutomationQueryClient());

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: content.admin.automation.scope.paymentReminders }),
      ).toBeInTheDocument();
    });
  }

  it("clamps values above 20 even when the saved value is already 20", async () => {
    navigationMocks.searchParams = new URLSearchParams("scope=paymentReminders");
    renderAutomationCenter(
      seedAutomationQueryClient({
        ...DEFAULT_PLATFORM_AUTOMATION_CONFIG,
        paymentReminders: {
          ...DEFAULT_PLATFORM_AUTOMATION_CONFIG.paymentReminders,
          maxRemindersPerCycle: 20,
        },
      }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: content.admin.automation.scope.paymentReminders }),
      ).toBeInTheDocument();
    });

    const maxRemindersInput = screen.getByLabelText(
      content.admin.automation.fields.maxRemindersPerCycle,
    );
    expect(maxRemindersInput).toHaveValue(20);

    fireEvent.change(maxRemindersInput, { target: { value: "25" } });
    expect(maxRemindersInput).toHaveValue(20);
    expect(screen.queryByText(maxRemindersRangeError)).not.toBeInTheDocument();
  });

  it("clamps values above 20 while typing from a lower starting value", async () => {
    navigationMocks.searchParams = new URLSearchParams("scope=paymentReminders");
    await openPaymentRemindersTab();

    const maxRemindersInput = screen.getByLabelText(
      content.admin.automation.fields.maxRemindersPerCycle,
    );
    fireEvent.change(maxRemindersInput, { target: { value: "25" } });

    expect(maxRemindersInput).toHaveValue(20);
  });

  it("saves the clamped max reminders value after entering a number above 20", async () => {
    const user = userEvent.setup();
    const updateSpy = vi.spyOn(automationApi, "updateAutomationConfig").mockResolvedValue({
      ...DEFAULT_PLATFORM_AUTOMATION_CONFIG,
      paymentReminders: {
        ...DEFAULT_PLATFORM_AUTOMATION_CONFIG.paymentReminders,
        maxRemindersPerCycle: 20,
      },
    });

    navigationMocks.searchParams = new URLSearchParams("scope=paymentReminders");
    await openPaymentRemindersTab();

    const maxRemindersInput = screen.getByLabelText(
      content.admin.automation.fields.maxRemindersPerCycle,
    );
    fireEvent.change(maxRemindersInput, { target: { value: "25" } });
    expect(maxRemindersInput).toHaveValue(20);

    await user.click(screen.getByRole("button", { name: content.admin.automation.save }));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith({
        paymentReminders: {
          ...DEFAULT_PLATFORM_AUTOMATION_CONFIG.paymentReminders,
          maxRemindersPerCycle: 20,
        },
      });
    });

    updateSpy.mockRestore();
  });

  it("shows an inline range error when save is attempted with an out-of-range loaded value", async () => {
    const user = userEvent.setup();
    const updateSpy = vi.spyOn(automationApi, "updateAutomationConfig");

    navigationMocks.searchParams = new URLSearchParams("scope=paymentReminders");
    renderAutomationCenter(
      seedAutomationQueryClient({
        ...DEFAULT_PLATFORM_AUTOMATION_CONFIG,
        paymentReminders: {
          ...DEFAULT_PLATFORM_AUTOMATION_CONFIG.paymentReminders,
          maxRemindersPerCycle: 25,
        },
      }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: content.admin.automation.scope.paymentReminders }),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByLabelText(content.admin.automation.fields.maxRemindersPerCycle),
    ).toHaveValue(25);
    expect(screen.getByText(maxRemindersRangeError)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: content.admin.automation.save }));

    await waitFor(() => {
      expect(screen.getByText(maxRemindersRangeError)).toBeInTheDocument();
    });
    expect(updateSpy).not.toHaveBeenCalled();

    updateSpy.mockRestore();
  });

  it("clears the inline range error after blurring a corrected value", async () => {
    navigationMocks.searchParams = new URLSearchParams("scope=paymentReminders");
    renderAutomationCenter(
      seedAutomationQueryClient({
        ...DEFAULT_PLATFORM_AUTOMATION_CONFIG,
        paymentReminders: {
          ...DEFAULT_PLATFORM_AUTOMATION_CONFIG.paymentReminders,
          maxRemindersPerCycle: 25,
        },
      }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: content.admin.automation.scope.paymentReminders }),
      ).toBeInTheDocument();
    });

    const maxRemindersInput = screen.getByLabelText(
      content.admin.automation.fields.maxRemindersPerCycle,
    );
    expect(screen.getByText(maxRemindersRangeError)).toBeInTheDocument();

    fireEvent.blur(maxRemindersInput);

    await waitFor(() => {
      expect(maxRemindersInput).toHaveValue(20);
      expect(screen.queryByText(maxRemindersRangeError)).not.toBeInTheDocument();
    });
  });
});

describe("AdminAutomationCenter payment reminders day list fields", () => {
  function seedAutomationQueryClient(
    config: typeof DEFAULT_PLATFORM_AUTOMATION_CONFIG = DEFAULT_PLATFORM_AUTOMATION_CONFIG,
  ) {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(["admin", "automation", "config"], config);
    seedAutomationRunHistoryCache(queryClient, [{ runs: [], total: 0 }]);
    return queryClient;
  }

  async function openPaymentRemindersTab() {
    renderAutomationCenter(seedAutomationQueryClient());

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: content.admin.automation.scope.paymentReminders }),
      ).toBeInTheDocument();
    });
  }

  it("filters invalid tokens such as x from reminder days before due", async () => {
    navigationMocks.searchParams = new URLSearchParams("scope=paymentReminders");
    await openPaymentRemindersTab();

    const beforeDueInput = screen.getByLabelText(
      content.admin.automation.fields.reminderDaysBeforeDue,
    );
    expect(beforeDueInput).toHaveValue("3, 1");

    fireEvent.change(beforeDueInput, { target: { value: "3, x, 1" } });
    fireEvent.blur(beforeDueInput);

    expect(beforeDueInput).toHaveValue("3, 1");
  });

  it("keeps the cleaned reminder days display when invalid tokens match the saved values", async () => {
    navigationMocks.searchParams = new URLSearchParams("scope=paymentReminders");
    renderAutomationCenter(
      seedAutomationQueryClient({
        ...DEFAULT_PLATFORM_AUTOMATION_CONFIG,
        paymentReminders: {
          ...DEFAULT_PLATFORM_AUTOMATION_CONFIG.paymentReminders,
          reminderDaysBeforeDue: [3, 1],
        },
      }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: content.admin.automation.scope.paymentReminders }),
      ).toBeInTheDocument();
    });

    const beforeDueInput = screen.getByLabelText(
      content.admin.automation.fields.reminderDaysBeforeDue,
    );
    fireEvent.change(beforeDueInput, { target: { value: "3, x, 1" } });
    fireEvent.blur(beforeDueInput);

    expect(beforeDueInput).toHaveValue("3, 1");
  });

  it("filters out-of-range reminder days before saving", async () => {
    const user = userEvent.setup();
    const updateSpy = vi.spyOn(automationApi, "updateAutomationConfig").mockResolvedValue({
      ...DEFAULT_PLATFORM_AUTOMATION_CONFIG,
      paymentReminders: {
        ...DEFAULT_PLATFORM_AUTOMATION_CONFIG.paymentReminders,
        reminderDaysBeforeDue: [3, 1],
      },
    });

    navigationMocks.searchParams = new URLSearchParams("scope=paymentReminders");
    renderAutomationCenter(
      seedAutomationQueryClient({
        ...DEFAULT_PLATFORM_AUTOMATION_CONFIG,
        paymentReminders: {
          ...DEFAULT_PLATFORM_AUTOMATION_CONFIG.paymentReminders,
          reminderDaysBeforeDue: [3, 99, 1],
        },
      }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: content.admin.automation.scope.paymentReminders }),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: content.admin.automation.save }));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith({
        paymentReminders: {
          ...DEFAULT_PLATFORM_AUTOMATION_CONFIG.paymentReminders,
          reminderDaysBeforeDue: [3, 1],
        },
      });
    });

    updateSpy.mockRestore();
  });
});

describe("AdminAutomationCenter draft sync", () => {
  it("preserves unsaved edits when config refetches in the background", async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(
      ["admin", "automation", "config"],
      DEFAULT_PLATFORM_AUTOMATION_CONFIG,
    );
    seedAutomationRunHistoryCache(queryClient, [{ runs: [], total: 0 }]);

    renderAutomationCenter(queryClient);

    await waitFor(() => {
      expect(screen.getByTestId("automation-run-preview")).toBeInTheDocument();
    });

    await user.click(
      screen.getAllByRole("tab", { name: content.admin.automation.scope.billingCycle })[0]!,
    );

    const cycleStartInput = screen.getByLabelText(
      content.admin.automation.fields.cycleStartDay,
    );
    fireEvent.change(cycleStartInput, { target: { value: "15" } });

    expect(cycleStartInput).toHaveValue(15);

    queryClient.setQueryData(["admin", "automation", "config"], {
      ...DEFAULT_PLATFORM_AUTOMATION_CONFIG,
      global: {
        ...DEFAULT_PLATFORM_AUTOMATION_CONFIG.global,
        timezone: "America/New_York",
      },
    });

    await waitFor(() => {
      expect(cycleStartInput).toHaveValue(15);
    });
  });

  it("applies a clean draft when the server config changes on refetch", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(
      ["admin", "automation", "config"],
      DEFAULT_PLATFORM_AUTOMATION_CONFIG,
    );
    seedAutomationRunHistoryCache(queryClient, [{ runs: [], total: 0 }]);

    renderAutomationCenter(queryClient);

    await waitFor(() => {
      expect(screen.getByTestId("automation-run-preview")).toBeInTheDocument();
    });

    const enabledSwitch = screen.getByRole("switch", {
      name: content.admin.automation.fields.globalEnabled,
    });
    expect(enabledSwitch).not.toBeChecked();

    queryClient.setQueryData(["admin", "automation", "config"], {
      ...DEFAULT_PLATFORM_AUTOMATION_CONFIG,
      global: {
        ...DEFAULT_PLATFORM_AUTOMATION_CONFIG.global,
        enabled: true,
      },
    });

    await waitFor(() => {
      expect(enabledSwitch).toBeChecked();
    });
  });
});

describe("AdminAutomationCenter post-save UI sync", () => {
  function seedAutomationQueryClient(
    config: typeof DEFAULT_PLATFORM_AUTOMATION_CONFIG = DEFAULT_PLATFORM_AUTOMATION_CONFIG,
  ) {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(["admin", "automation", "config"], config);
    seedAutomationRunHistoryCache(queryClient, [{ runs: [], total: 0 }]);
    return queryClient;
  }

  it("keeps saved values visible after save when a stale refetch overwrites the cache", async () => {
    const user = userEvent.setup();
    const savedConfig = {
      ...DEFAULT_PLATFORM_AUTOMATION_CONFIG,
      global: {
        ...DEFAULT_PLATFORM_AUTOMATION_CONFIG.global,
        enabled: true,
      },
    };

    const updateSpy = vi
      .spyOn(automationApi, "updateAutomationConfig")
      .mockResolvedValue(savedConfig);

    const queryClient = seedAutomationQueryClient();
    const { queryClient: client } = renderAutomationCenter(queryClient);

    const enabledSwitch = await screen.findByRole("switch", {
      name: content.admin.automation.fields.globalEnabled,
    });
    const runNowButton = screen.getByTestId("automation-run-now");

    fireEvent.click(enabledSwitch);
    await waitFor(() => expect(enabledSwitch).toBeChecked());
    expect(runNowButton).toBeDisabled();

    await user.click(screen.getByRole("button", { name: content.admin.automation.save }));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalled();
      expect(runNowButton).toBeEnabled();
    });

    client.setQueryData(["admin", "automation", "config"], DEFAULT_PLATFORM_AUTOMATION_CONFIG);

    await waitFor(() => {
      expect(enabledSwitch).toBeChecked();
      expect(runNowButton).toBeEnabled();
    });
    expect(client.getQueryData(["admin", "automation", "config"])).toEqual(savedConfig);

    updateSpy.mockRestore();
  });

  it("shows saved toggle state on another tab without reloading", async () => {
    const user = userEvent.setup();
    const savedConfig = {
      ...DEFAULT_PLATFORM_AUTOMATION_CONFIG,
      invoices: {
        ...DEFAULT_PLATFORM_AUTOMATION_CONFIG.invoices,
        sendOnRenewalDue: false,
      },
    };

    const updateSpy = vi
      .spyOn(automationApi, "updateAutomationConfig")
      .mockResolvedValue(savedConfig);

    navigationMocks.searchParams = new URLSearchParams("scope=invoices");
    renderAutomationCenter(seedAutomationQueryClient());

    const toggle = await screen.findByRole("switch", {
      name: content.admin.automation.fields.sendOnRenewalDue,
    });
    fireEvent.click(toggle);
    await waitFor(() => expect(toggle).not.toBeChecked());

    await user.click(screen.getByRole("button", { name: content.admin.automation.save }));

    await waitFor(() => expect(updateSpy).toHaveBeenCalled());

    navigationMocks.searchParams = new URLSearchParams("scope=billingCycle");
    await user.click(
      screen.getAllByRole("tab", { name: content.admin.automation.scope.billingCycle })[0]!,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: content.admin.automation.scope.billingCycle }),
      ).toBeInTheDocument();
    });

    await user.click(
      screen.getAllByRole("tab", { name: content.admin.automation.scope.invoices })[0]!,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("switch", { name: content.admin.automation.fields.sendOnRenewalDue }),
      ).not.toBeChecked();
    });

    updateSpy.mockRestore();
  });
});

describe("AdminAutomationCenter save and run double-click guards", () => {
  const sampleRunResponse: AutomationRunLogDto = {
    ...sampleHistoryRun,
    id: "run-double-click",
    trigger: "DRY_RUN",
    status: "SUCCESS",
  };

  function seedActionQueryClient(
    config: typeof DEFAULT_PLATFORM_AUTOMATION_CONFIG = DEFAULT_PLATFORM_AUTOMATION_CONFIG,
  ) {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(["admin", "automation", "config"], config);
    seedAutomationRunHistoryCache(queryClient, [{ runs: [], total: 0 }]);
    return queryClient;
  }

  function createDeferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((res) => {
      resolve = res;
    });
    return { promise, resolve };
  }

  it("fires only one preview run request when Run Preview is double-clicked", async () => {
    let runCalls = 0;
    const deferred = createDeferred<void>();

    server.use(
      http.post("/api/admin/automation/run", async () => {
        runCalls += 1;
        await deferred.promise;
        return HttpResponse.json(sampleRunResponse);
      }),
    );

    renderAutomationCenter(seedActionQueryClient());

    const previewButton = await screen.findByTestId("automation-run-preview");
    fireEvent.click(previewButton);
    fireEvent.click(previewButton);

    await waitFor(() => expect(runCalls).toBe(1));
    expect(previewButton).toBeDisabled();

    deferred.resolve();
    await waitFor(() => expect(previewButton).toBeEnabled());
  });

  it("fires only one live run request when Run Now is double-clicked", async () => {
    let runCalls = 0;
    const deferred = createDeferred<void>();
    const liveConfig = {
      ...DEFAULT_PLATFORM_AUTOMATION_CONFIG,
      global: {
        ...DEFAULT_PLATFORM_AUTOMATION_CONFIG.global,
        enabled: true,
      },
    };

    server.use(
      http.post("/api/admin/automation/run", async () => {
        runCalls += 1;
        await deferred.promise;
        return HttpResponse.json({
          ...sampleRunResponse,
          trigger: "MANUAL",
        });
      }),
    );

    renderAutomationCenter(seedActionQueryClient(liveConfig));

    const runNowButton = await screen.findByTestId("automation-run-now");
    fireEvent.click(runNowButton);
    await waitFor(() => {
      expect(screen.getByTestId("automation-run-now-dialog")).toBeInTheDocument();
    });

    const confirmButton = screen.getByTestId("automation-run-now-confirm");
    fireEvent.click(confirmButton);
    fireEvent.click(confirmButton);

    await waitFor(() => expect(runCalls).toBe(1));
    expect(runNowButton).toBeDisabled();

    deferred.resolve();
    await waitFor(() => expect(runNowButton).toBeEnabled());
  });

  it("fires only one save request when Save is double-clicked on overview", async () => {
    let patchCalls = 0;
    const deferred = createDeferred<void>();

    server.use(
      http.patch("/api/admin/automation/config", async () => {
        patchCalls += 1;
        await deferred.promise;
        return HttpResponse.json(DEFAULT_PLATFORM_AUTOMATION_CONFIG);
      }),
    );

    renderAutomationCenter(seedActionQueryClient());

    const saveButton = await screen.findByTestId("automation-save");
    fireEvent.click(saveButton);
    fireEvent.click(saveButton);

    await waitFor(() => expect(patchCalls).toBe(1));
    expect(saveButton).toBeDisabled();

    deferred.resolve();
    await waitFor(() => expect(saveButton).toBeEnabled());
  });

  it.each([
    ["billingCycle", content.admin.automation.scope.billingCycle],
    ["invoices", content.admin.automation.scope.invoices],
    ["whatsApp", content.admin.automation.scope.whatsApp],
  ] as const)(
    "fires only one save request when Save is double-clicked on the %s tab",
    async (scope, scopeLabel) => {
      let patchCalls = 0;
      const deferred = createDeferred<void>();

      navigationMocks.searchParams = new URLSearchParams(`scope=${scope}`);
      server.use(
        http.patch("/api/admin/automation/config", async () => {
          patchCalls += 1;
          await deferred.promise;
          return HttpResponse.json(DEFAULT_PLATFORM_AUTOMATION_CONFIG);
        }),
      );

      renderAutomationCenter(seedActionQueryClient());

      await screen.findByRole("heading", { name: scopeLabel });

      const saveButton = screen.getByTestId("automation-save");
      fireEvent.click(saveButton);
      fireEvent.click(saveButton);

      await waitFor(() => expect(patchCalls).toBe(1));
      expect(saveButton).toBeDisabled();

      deferred.resolve();
      await waitFor(() => expect(saveButton).toBeEnabled());
    },
  );
});

describe("AdminAutomationCenter WhatsApp validation", () => {
  function seedWhatsAppQueryClient(
    config: typeof DEFAULT_PLATFORM_AUTOMATION_CONFIG = DEFAULT_PLATFORM_AUTOMATION_CONFIG,
  ) {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(["admin", "automation", "config"], config);
    seedAutomationRunHistoryCache(queryClient, [{ runs: [], total: 0 }]);
    return queryClient;
  }

  async function openWhatsAppTab() {
    renderAutomationCenter(seedWhatsAppQueryClient());

    await waitFor(() => {
      expect(
        screen.getByLabelText(content.admin.automation.fields.businessHoursStart),
      ).toBeInTheDocument();
    });
  }

  it("normalizes loosely formatted business hours start on blur", async () => {
    navigationMocks.searchParams = new URLSearchParams("scope=whatsApp");
    await openWhatsAppTab();

    const startInput = screen.getByLabelText(content.admin.automation.fields.businessHoursStart);
    fireEvent.change(startInput, { target: { value: "9:00" } });
    fireEvent.blur(startInput);

    expect(startInput).toHaveValue("09:00");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("normalizes loosely formatted business hours end on blur", async () => {
    navigationMocks.searchParams = new URLSearchParams("scope=whatsApp");
    await openWhatsAppTab();

    const endInput = screen.getByLabelText(content.admin.automation.fields.businessHoursEnd);
    fireEvent.change(endInput, { target: { value: "18:0" } });
    fireEvent.blur(endInput);

    expect(endInput).toHaveValue("18:00");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows inline errors for unrecoverable business hours on blur", async () => {
    navigationMocks.searchParams = new URLSearchParams("scope=whatsApp");
    await openWhatsAppTab();

    const startInput = screen.getByLabelText(content.admin.automation.fields.businessHoursStart);
    fireEvent.change(startInput, { target: { value: "bad" } });
    fireEvent.blur(startInput);

    expect(await screen.findByRole("alert")).toHaveTextContent(AUTOMATION_TIME_FORMAT_MESSAGE);
    expect(startInput).toHaveAttribute("aria-invalid", "true");
  });

  it("shows inline errors for invalid business hours on save", async () => {
    const user = userEvent.setup();
    navigationMocks.searchParams = new URLSearchParams("scope=whatsApp");
    await openWhatsAppTab();

    const startInput = screen.getByLabelText(content.admin.automation.fields.businessHoursStart);
    fireEvent.change(startInput, { target: { value: "bad" } });
    fireEvent.blur(startInput);

    await user.click(screen.getByRole("button", { name: content.admin.automation.save }));

    expect(await screen.findByRole("alert")).toHaveTextContent(AUTOMATION_TIME_FORMAT_MESSAGE);
    expect(startInput).toHaveAttribute("aria-invalid", "true");
  });

  it("clears inline business hours errors when the value is corrected", async () => {
    navigationMocks.searchParams = new URLSearchParams("scope=whatsApp");
    await openWhatsAppTab();

    const startInput = screen.getByLabelText(content.admin.automation.fields.businessHoursStart);
    fireEvent.change(startInput, { target: { value: "bad" } });
    fireEvent.blur(startInput);
    expect(await screen.findByRole("alert")).toBeInTheDocument();

    fireEvent.change(startInput, { target: { value: "09:00" } });
    fireEvent.blur(startInput);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(startInput).not.toHaveAttribute("aria-invalid", "true");
    expect(startInput).toHaveValue("09:00");
  });

  it("maps invalid end business hours on save", async () => {
    const user = userEvent.setup();
    navigationMocks.searchParams = new URLSearchParams("scope=whatsApp");
    await openWhatsAppTab();

    const endInput = screen.getByLabelText(content.admin.automation.fields.businessHoursEnd);
    fireEvent.change(endInput, { target: { value: "25:00" } });
    fireEvent.blur(endInput);

    await user.click(screen.getByRole("button", { name: content.admin.automation.save }));

    expect(await screen.findByRole("alert")).toHaveTextContent(AUTOMATION_TIME_FORMAT_MESSAGE);
    expect(endInput).toHaveAttribute("aria-invalid", "true");
  });

  it("saves normalized business hours after blur without server rejection", async () => {
    const user = userEvent.setup();
    const updateSpy = vi.spyOn(automationApi, "updateAutomationConfig").mockResolvedValue({
      ...DEFAULT_PLATFORM_AUTOMATION_CONFIG,
      whatsApp: {
        ...DEFAULT_PLATFORM_AUTOMATION_CONFIG.whatsApp,
        businessHoursStart: "09:00",
        businessHoursEnd: "18:00",
      },
    });

    navigationMocks.searchParams = new URLSearchParams("scope=whatsApp");
    await openWhatsAppTab();

    const startInput = screen.getByLabelText(content.admin.automation.fields.businessHoursStart);
    fireEvent.change(startInput, { target: { value: "9:00" } });
    fireEvent.blur(startInput);
    expect(startInput).toHaveValue("09:00");

    await user.click(screen.getByRole("button", { name: content.admin.automation.save }));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith({
        whatsApp: {
          ...DEFAULT_PLATFORM_AUTOMATION_CONFIG.whatsApp,
          businessHoursStart: "09:00",
        },
      });
    });

    updateSpy.mockRestore();
  });

  it("normalizes loosely formatted business hours on save when blur was skipped", async () => {
    const user = userEvent.setup();
    const updateSpy = vi.spyOn(automationApi, "updateAutomationConfig").mockResolvedValue({
      ...DEFAULT_PLATFORM_AUTOMATION_CONFIG,
      whatsApp: {
        ...DEFAULT_PLATFORM_AUTOMATION_CONFIG.whatsApp,
        businessHoursEnd: "18:00",
      },
    });

    navigationMocks.searchParams = new URLSearchParams("scope=whatsApp");
    await openWhatsAppTab();

    const endInput = screen.getByLabelText(content.admin.automation.fields.businessHoursEnd);
    fireEvent.change(endInput, { target: { value: "18:0" } });

    await user.click(screen.getByRole("button", { name: content.admin.automation.save }));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith({
        whatsApp: {
          ...DEFAULT_PLATFORM_AUTOMATION_CONFIG.whatsApp,
          businessHoursEnd: "18:00",
        },
      });
    });

    updateSpy.mockRestore();
  });
});

describe("AdminAutomationCenter Run Now confirmation", () => {
  function seedLiveRunQueryClient(
    config: typeof DEFAULT_PLATFORM_AUTOMATION_CONFIG = {
      ...DEFAULT_PLATFORM_AUTOMATION_CONFIG,
      global: {
        ...DEFAULT_PLATFORM_AUTOMATION_CONFIG.global,
        enabled: true,
      },
    },
  ) {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(["admin", "automation", "config"], config);
    seedAutomationRunHistoryCache(queryClient, [{ runs: [], total: 0 }]);
    return queryClient;
  }

  it("opens a confirmation dialog before starting a live run", async () => {
    const user = userEvent.setup();
    let runCalls = 0;

    server.use(
      http.post("/api/admin/automation/run", () => {
        runCalls += 1;
        return HttpResponse.json({
          ...sampleHistoryRun,
          trigger: "MANUAL",
        });
      }),
    );

    renderAutomationCenter(seedLiveRunQueryClient());

    await openAutomationRunNowConfirm(user);

    expect(screen.getByText(content.admin.automation.runNowConfirm.title)).toBeInTheDocument();
    expect(screen.getByTestId("automation-run-now-action-list")).toHaveTextContent(
      content.admin.automation.runNowConfirm.actions.paymentReminderEmails,
    );
    expect(screen.getByText(content.admin.automation.runNowConfirm.auditHint)).toBeInTheDocument();
    expect(runCalls).toBe(0);
  });

  it("does not call the run API when the confirmation dialog is cancelled", async () => {
    const user = userEvent.setup();
    let runCalls = 0;

    server.use(
      http.post("/api/admin/automation/run", () => {
        runCalls += 1;
        return HttpResponse.json(sampleHistoryRun);
      }),
    );

    renderAutomationCenter(seedLiveRunQueryClient());

    await openAutomationRunNowConfirm(user);
    await user.click(screen.getByTestId("automation-run-now-cancel"));

    await waitFor(() => {
      expect(screen.queryByTestId("automation-run-now-dialog")).not.toBeInTheDocument();
    });
    expect(runCalls).toBe(0);
  });

  it("starts a live run only after the user confirms the dialog", async () => {
    const user = userEvent.setup();
    let runCalls = 0;

    server.use(
      http.post("/api/admin/automation/run", () => {
        runCalls += 1;
        return HttpResponse.json({
          ...sampleHistoryRun,
          trigger: "MANUAL",
          status: "SUCCESS",
        });
      }),
    );

    renderAutomationCenter(seedLiveRunQueryClient());

    await confirmAutomationLiveRun(user);

    await waitFor(() => expect(runCalls).toBe(1));
  });

  it("does not show the confirmation dialog for preview runs", async () => {
    const user = userEvent.setup();
    let runCalls = 0;

    server.use(
      http.post("/api/admin/automation/run", () => {
        runCalls += 1;
        return HttpResponse.json(sampleHistoryRun);
      }),
    );

    renderAutomationCenter(seedLiveRunQueryClient());

    await user.click(screen.getByTestId("automation-run-preview"));

    await waitFor(() => expect(runCalls).toBe(1));
    expect(screen.queryByTestId("automation-run-now-dialog")).not.toBeInTheDocument();
  });

  it("shows dry run guidance in the confirmation dialog when dry run mode is saved on", async () => {
    const user = userEvent.setup();

    renderAutomationCenter(
      seedLiveRunQueryClient({
        ...DEFAULT_PLATFORM_AUTOMATION_CONFIG,
        global: {
          ...DEFAULT_PLATFORM_AUTOMATION_CONFIG.global,
          enabled: true,
          dryRunMode: true,
        },
      }),
    );

    await openAutomationRunNowConfirm(user);

    expect(screen.getByTestId("automation-run-now-dry-run-notice")).toHaveTextContent(
      content.admin.automation.runNowConfirm.dryRunNotice,
    );
  });
});

describe("AdminAutomationCenter Run Now gating", () => {
  it("disables Run Now when the master switch is off", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(
      ["admin", "automation", "config"],
      DEFAULT_PLATFORM_AUTOMATION_CONFIG,
    );
    seedAutomationRunHistoryCache(queryClient, [{ runs: [], total: 0 }]);

    renderAutomationCenter(queryClient);

    await waitFor(() => {
      expect(screen.getByTestId("automation-run-now")).toBeInTheDocument();
    });

    expect(screen.getByRole("switch", { name: content.admin.automation.fields.globalEnabled })).not.toBeChecked();
    expect(screen.getByTestId("automation-run-now")).toBeDisabled();
    expect(screen.getByTestId("automation-run-preview")).toBeEnabled();
  });

  it("disables Run Now immediately when the master switch is toggled off", async () => {
    const user = userEvent.setup();
    const enabledConfig = {
      ...DEFAULT_PLATFORM_AUTOMATION_CONFIG,
      global: {
        ...DEFAULT_PLATFORM_AUTOMATION_CONFIG.global,
        enabled: true,
      },
    };

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(["admin", "automation", "config"], enabledConfig);
    seedAutomationRunHistoryCache(queryClient, [{ runs: [], total: 0 }]);

    renderAutomationCenter(queryClient);

    const enabledSwitch = await screen.findByRole("switch", {
      name: content.admin.automation.fields.globalEnabled,
    });
    const runNowButton = screen.getByTestId("automation-run-now");

    await waitFor(() => {
      expect(enabledSwitch).toBeChecked();
      expect(runNowButton).toBeEnabled();
    });

    await user.click(enabledSwitch);

    expect(enabledSwitch).not.toBeChecked();
    expect(runNowButton).toBeDisabled();
  });

  it("keeps Run Now disabled when the draft switch is on but automations are saved off", async () => {
    const user = userEvent.setup();

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(
      ["admin", "automation", "config"],
      DEFAULT_PLATFORM_AUTOMATION_CONFIG,
    );
    seedAutomationRunHistoryCache(queryClient, [{ runs: [], total: 0 }]);

    renderAutomationCenter(queryClient);

    const enabledSwitch = await screen.findByRole("switch", {
      name: content.admin.automation.fields.globalEnabled,
    });
    const runNowButton = screen.getByTestId("automation-run-now");

    expect(enabledSwitch).not.toBeChecked();
    expect(runNowButton).toBeDisabled();

    await user.click(enabledSwitch);

    expect(enabledSwitch).toBeChecked();
    expect(runNowButton).toBeDisabled();
  });

  it("preserves a toggled-off master switch when enabled config arrives from the server", async () => {
    const enabledConfig = {
      ...DEFAULT_PLATFORM_AUTOMATION_CONFIG,
      global: {
        ...DEFAULT_PLATFORM_AUTOMATION_CONFIG.global,
        enabled: true,
      },
    };

    server.use(
      http.get("/api/admin/automation/config", () => HttpResponse.json(enabledConfig)),
    );

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(["admin", "automation", "config"], enabledConfig);
    seedAutomationRunHistoryCache(queryClient, [{ runs: [], total: 0 }]);

    renderAutomationCenter(queryClient);

    const enabledSwitch = await screen.findByRole("switch", {
      name: content.admin.automation.fields.globalEnabled,
    });
    const runNowButton = screen.getByTestId("automation-run-now");

    await waitFor(() => {
      expect(enabledSwitch).toBeChecked();
      expect(runNowButton).toBeEnabled();
    });

    fireEvent.click(enabledSwitch);

    expect(enabledSwitch).not.toBeChecked();
    expect(runNowButton).toBeDisabled();

    queryClient.setQueryData(["admin", "automation", "config"], enabledConfig);

    await waitFor(() => {
      expect(enabledSwitch).not.toBeChecked();
      expect(runNowButton).toBeDisabled();
    });
  });
});

describe("AdminAutomationCenter schema field controls", () => {
  const scopeLabels: Record<(typeof AUTOMATION_CONFIG_SCOPES)[number], string> = {
    overview: content.admin.automation.scope.overview,
    billingCycle: content.admin.automation.scope.billingCycle,
    invoices: content.admin.automation.scope.invoices,
    paymentReminders: content.admin.automation.scope.paymentReminders,
    followUps: content.admin.automation.scope.followUps,
    expiryRenewal: content.admin.automation.scope.expiryRenewal,
    monthlyReports: content.admin.automation.scope.monthlyReports,
    whatsApp: content.admin.automation.scope.whatsApp,
  };

  function seedAutomationQueryClient() {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(
      ["admin", "automation", "config"],
      DEFAULT_PLATFORM_AUTOMATION_CONFIG,
    );
    seedAutomationRunHistoryCache(queryClient, [{ runs: [], total: 0 }]);
    return queryClient;
  }

  it.each([
    ["invoices", content.admin.automation.fields.sendOnRenewalDue],
    ["paymentReminders", content.admin.automation.fields.stopAfterPayment],
    ["followUps", content.admin.automation.fields.escalateAfterMax],
    ["expiryRenewal", content.admin.automation.fields.autoExtendOnPayment],
    ["monthlyReports", content.admin.automation.fields.includeBillingSummary],
  ] as const)("shows %s on the %s tab", async (scope, label) => {
    navigationMocks.searchParams = new URLSearchParams(`scope=${scope}`);

    renderAutomationCenter(seedAutomationQueryClient());

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: scopeLabels[scope] })).toBeInTheDocument();
    });

    expect(screen.getByRole("switch", { name: label })).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: label })).toBeChecked();
  });

  it("disables schema field controls for read-only platform admins", async () => {
    navigationMocks.searchParams = new URLSearchParams("scope=monthlyReports");

    const queryClient = seedAutomationQueryClient();

    renderAutomationCenter(queryClient, "PLATFORM_ADMIN");

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: content.admin.automation.scope.monthlyReports }),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByRole("switch", { name: content.admin.automation.fields.includeBillingSummary }),
    ).toBeDisabled();
  });
});

describe("AdminAutomationCenter invoices sendOnRenewalDue", () => {
  function seedAutomationQueryClient() {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(
      ["admin", "automation", "config"],
      DEFAULT_PLATFORM_AUTOMATION_CONFIG,
    );
    seedAutomationRunHistoryCache(queryClient, [{ runs: [], total: 0 }]);
    return queryClient;
  }

  it("shows the send on renewal due toggle on the invoices tab", async () => {
    navigationMocks.searchParams = new URLSearchParams("scope=invoices");

    renderAutomationCenter(seedAutomationQueryClient());

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: content.admin.automation.scope.invoices }),
      ).toBeInTheDocument();
    });

    const toggle = screen.getByRole("switch", {
      name: content.admin.automation.fields.sendOnRenewalDue,
    });
    expect(toggle).toBeInTheDocument();
    expect(toggle).toBeChecked();
    expect(screen.getByText(content.admin.automation.fields.sendOnRenewalDueHint)).toBeInTheDocument();
  });

  it("saves sendOnRenewalDue when toggled off on the invoices tab", async () => {
    const user = userEvent.setup();
    const updateSpy = vi.spyOn(automationApi, "updateAutomationConfig").mockResolvedValue({
      ...DEFAULT_PLATFORM_AUTOMATION_CONFIG,
      invoices: {
        ...DEFAULT_PLATFORM_AUTOMATION_CONFIG.invoices,
        sendOnRenewalDue: false,
      },
    });

    navigationMocks.searchParams = new URLSearchParams("scope=invoices");
    renderAutomationCenter(seedAutomationQueryClient());

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: content.admin.automation.scope.invoices }),
      ).toBeInTheDocument();
    });

    const toggle = screen.getByRole("switch", {
      name: content.admin.automation.fields.sendOnRenewalDue,
    });
    fireEvent.click(toggle);
    await waitFor(() => {
      expect(toggle).not.toBeChecked();
    });

    await user.click(screen.getByRole("button", { name: content.admin.automation.save }));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith({
        invoices: {
          ...DEFAULT_PLATFORM_AUTOMATION_CONFIG.invoices,
          sendOnRenewalDue: false,
        },
      });
    });

    updateSpy.mockRestore();
  });

  it("disables sendOnRenewalDue for read-only platform admins", async () => {
    navigationMocks.searchParams = new URLSearchParams("scope=invoices");

    const queryClient = seedAutomationQueryClient();
    renderAutomationCenter(queryClient, "PLATFORM_ADMIN");

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: content.admin.automation.scope.invoices }),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByRole("switch", { name: content.admin.automation.fields.sendOnRenewalDue }),
    ).toBeDisabled();
  });
});

describe("AdminAutomationCenter WhatsApp default country code", () => {
  function seedAutomationQueryClient() {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(
      ["admin", "automation", "config"],
      DEFAULT_PLATFORM_AUTOMATION_CONFIG,
    );
    seedAutomationRunHistoryCache(queryClient, [{ runs: [], total: 0 }]);
    return queryClient;
  }

  it("shows the default country code field on the WhatsApp tab", async () => {
    navigationMocks.searchParams = new URLSearchParams("scope=whatsApp");

    renderAutomationCenter(seedAutomationQueryClient());

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: content.admin.automation.scope.whatsApp }),
      ).toBeInTheDocument();
    });

    expect(screen.getByLabelText(content.admin.automation.fields.defaultCountryCode)).toHaveValue(
      DEFAULT_PLATFORM_AUTOMATION_CONFIG.whatsApp.defaultCountryCode,
    );
  });

  it("saves the default country code from the WhatsApp tab", async () => {
    const user = userEvent.setup();
    const updateSpy = vi.spyOn(automationApi, "updateAutomationConfig").mockResolvedValue({
      ...DEFAULT_PLATFORM_AUTOMATION_CONFIG,
      whatsApp: {
        ...DEFAULT_PLATFORM_AUTOMATION_CONFIG.whatsApp,
        defaultCountryCode: "1",
      },
    });

    navigationMocks.searchParams = new URLSearchParams("scope=whatsApp");
    renderAutomationCenter(seedAutomationQueryClient());

    await waitFor(() => {
      expect(screen.getByLabelText(content.admin.automation.fields.defaultCountryCode)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(content.admin.automation.fields.defaultCountryCode), {
      target: { value: "1" },
    });
    await user.click(screen.getByRole("button", { name: content.admin.automation.save }));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith({
        whatsApp: {
          ...DEFAULT_PLATFORM_AUTOMATION_CONFIG.whatsApp,
          defaultCountryCode: "1",
        },
      });
    });

    updateSpy.mockRestore();
  });

  it("shows an inline error when letters are entered in the default country code", async () => {
    navigationMocks.searchParams = new URLSearchParams("scope=whatsApp");
    renderAutomationCenter(seedAutomationQueryClient());

    await waitFor(() => {
      expect(
        screen.getByLabelText(content.admin.automation.fields.defaultCountryCode),
      ).toBeInTheDocument();
    });

    const countryCodeInput = screen.getByLabelText(
      content.admin.automation.fields.defaultCountryCode,
    );
    fireEvent.change(countryCodeInput, { target: { value: "abc" } });
    fireEvent.blur(countryCodeInput);

    expect(await screen.findByRole("alert")).toHaveTextContent(AUTOMATION_COUNTRY_CODE_MESSAGE);
    expect(countryCodeInput).toHaveAttribute("aria-invalid", "true");
  });

  it("blocks save and shows an inline error for letter country codes", async () => {
    const user = userEvent.setup();
    const updateSpy = vi.spyOn(automationApi, "updateAutomationConfig");

    navigationMocks.searchParams = new URLSearchParams("scope=whatsApp");
    renderAutomationCenter(seedAutomationQueryClient());

    await waitFor(() => {
      expect(
        screen.getByLabelText(content.admin.automation.fields.defaultCountryCode),
      ).toBeInTheDocument();
    });

    const countryCodeInput = screen.getByLabelText(
      content.admin.automation.fields.defaultCountryCode,
    );
    fireEvent.change(countryCodeInput, { target: { value: "abc" } });
    fireEvent.blur(countryCodeInput);

    await user.click(screen.getByRole("button", { name: content.admin.automation.save }));

    expect(await screen.findByRole("alert")).toHaveTextContent(AUTOMATION_COUNTRY_CODE_MESSAGE);
    expect(countryCodeInput).toHaveAttribute("aria-invalid", "true");
    expect(updateSpy).not.toHaveBeenCalled();

    updateSpy.mockRestore();
  });

  it("normalizes prefixed country codes on blur", async () => {
    navigationMocks.searchParams = new URLSearchParams("scope=whatsApp");
    renderAutomationCenter(seedAutomationQueryClient());

    await waitFor(() => {
      expect(
        screen.getByLabelText(content.admin.automation.fields.defaultCountryCode),
      ).toBeInTheDocument();
    });

    const countryCodeInput = screen.getByLabelText(
      content.admin.automation.fields.defaultCountryCode,
    );
    fireEvent.change(countryCodeInput, { target: { value: "+1" } });
    fireEvent.blur(countryCodeInput);

    expect(countryCodeInput).toHaveValue("1");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("clears the inline country code error after a valid value is entered", async () => {
    navigationMocks.searchParams = new URLSearchParams("scope=whatsApp");
    renderAutomationCenter(seedAutomationQueryClient());

    await waitFor(() => {
      expect(
        screen.getByLabelText(content.admin.automation.fields.defaultCountryCode),
      ).toBeInTheDocument();
    });

    const countryCodeInput = screen.getByLabelText(
      content.admin.automation.fields.defaultCountryCode,
    );
    fireEvent.change(countryCodeInput, { target: { value: "abc" } });
    fireEvent.blur(countryCodeInput);
    expect(await screen.findByRole("alert")).toBeInTheDocument();

    fireEvent.change(countryCodeInput, { target: { value: "1" } });
    fireEvent.blur(countryCodeInput);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(countryCodeInput).not.toHaveAttribute("aria-invalid", "true");
    expect(countryCodeInput).toHaveValue("1");
  });
});

describe("AdminAutomationCenter save validation feedback", () => {
  function seedAutomationQueryClient() {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(
      ["admin", "automation", "config"],
      DEFAULT_PLATFORM_AUTOMATION_CONFIG,
    );
    seedAutomationRunHistoryCache(queryClient, [{ runs: [], total: 0 }]);
    return queryClient;
  }

  it("shows an inline timezone error on client validation without calling the API", async () => {
    const user = userEvent.setup();
    const updateSpy = vi.spyOn(automationApi, "updateAutomationConfig");

    renderAutomationCenter(seedAutomationQueryClient());

    const timezoneInput = await screen.findByLabelText(content.admin.automation.fields.timezone);
    fireEvent.change(timezoneInput, { target: { value: "Not/A_Timezone" } });
    await user.click(screen.getByRole("button", { name: content.admin.automation.save }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid IANA timezone.");
    expect(timezoneInput).toHaveAttribute("aria-invalid", "true");
    expect(updateSpy).not.toHaveBeenCalled();

    updateSpy.mockRestore();
  });

  it("maps API validation errors to inline field messages instead of a generic toast", async () => {
    const user = userEvent.setup();
    const toastSpy = vi.spyOn(toastModule, "toast");
    const updateSpy = vi.spyOn(automationApi, "updateAutomationConfig").mockRejectedValueOnce(
      new ApiError(400, {
        message: "Validation failed",
        details: {
          formErrors: [],
          fieldErrors: {
            "global.timezone": ["Invalid IANA timezone."],
          },
        },
      }),
    );

    renderAutomationCenter(seedAutomationQueryClient());

    await user.click(screen.getByRole("button", { name: content.admin.automation.save }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid IANA timezone.");
    expect(toastSpy).not.toHaveBeenCalled();

    toastSpy.mockRestore();
    updateSpy.mockRestore();
  });

  it("maps indexed API validation errors to day list fields", async () => {
    const user = userEvent.setup();
    const toastSpy = vi.spyOn(toastModule, "toast");
    const updateSpy = vi.spyOn(automationApi, "updateAutomationConfig").mockRejectedValueOnce(
      new ApiError(400, {
        message: "Validation failed",
        details: {
          formErrors: [],
          fieldErrors: {
            "paymentReminders.reminderDaysBeforeDue.0": [
              "Too big: expected number to be <=90",
            ],
          },
        },
      }),
    );

    navigationMocks.searchParams = new URLSearchParams("scope=paymentReminders");
    renderAutomationCenter(seedAutomationQueryClient());

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: content.admin.automation.scope.paymentReminders }),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: content.admin.automation.save }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Too big: expected number to be <=90",
    );
    expect(toastSpy).not.toHaveBeenCalled();

    toastSpy.mockRestore();
    updateSpy.mockRestore();
  });

  it("shows a specific toast description when API validation has only form-level errors", async () => {
    const user = userEvent.setup();
    const toastSpy = vi.spyOn(toastModule, "toast");
    const updateSpy = vi.spyOn(automationApi, "updateAutomationConfig").mockRejectedValueOnce(
      new ApiError(400, {
        message: "Validation failed",
        details: {
          formErrors: ["At least one setting must be provided."],
          fieldErrors: {},
        },
      }),
    );

    renderAutomationCenter(seedAutomationQueryClient());

    await user.click(screen.getByRole("button", { name: content.admin.automation.save }));

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith({
        title: content.admin.automation.saveFailed,
        description: "At least one setting must be provided.",
      });
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    toastSpy.mockRestore();
    updateSpy.mockRestore();
  });
});

describe("AdminAutomationCenter offline save and run", () => {
  function mockBrowserOffline(offline: boolean) {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: !offline,
    });
  }

  afterEach(() => {
    mockBrowserOffline(false);
  });

  function seedAutomationQueryClient(globalEnabled = false) {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(["admin", "automation", "config"], {
      ...DEFAULT_PLATFORM_AUTOMATION_CONFIG,
      global: {
        ...DEFAULT_PLATFORM_AUTOMATION_CONFIG.global,
        enabled: globalEnabled,
      },
    });
    seedAutomationRunHistoryCache(queryClient, [{ runs: [], total: 0 }]);
    return queryClient;
  }

  it("shows an offline message when Save is clicked on overview while offline", async () => {
    mockBrowserOffline(true);
    const user = userEvent.setup();
    const toastSpy = vi.spyOn(toastModule, "toast");
    const updateSpy = vi.spyOn(automationApi, "updateAutomationConfig");

    renderAutomationCenter(seedAutomationQueryClient());

    await user.click(screen.getByRole("button", { name: content.admin.automation.save }));

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith({
        title: content.admin.automation.saveFailed,
        description: content.admin.automation.offlineHint,
      });
    });
    expect(updateSpy).not.toHaveBeenCalled();

    toastSpy.mockRestore();
    updateSpy.mockRestore();
  });

  it.each(AUTOMATION_CONFIG_SCOPES.filter((scope) => scope !== "overview"))(
    "shows an offline message when Save is clicked on the %s tab while offline",
    async (scope) => {
      mockBrowserOffline(true);
      navigationMocks.searchParams = new URLSearchParams(`scope=${scope}`);
      const user = userEvent.setup();
      const toastSpy = vi.spyOn(toastModule, "toast");
      const updateSpy = vi.spyOn(automationApi, "updateAutomationConfig");

      renderAutomationCenter(seedAutomationQueryClient());

      await waitFor(() => {
        expect(screen.getByTestId("automation-save")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("automation-save"));

      await waitFor(() => {
        expect(toastSpy).toHaveBeenCalledWith({
          title: content.admin.automation.saveFailed,
          description: content.admin.automation.offlineHint,
        });
      });
      expect(updateSpy).not.toHaveBeenCalled();

      toastSpy.mockRestore();
      updateSpy.mockRestore();
    },
  );

  it("shows an offline message when Preview run is clicked while offline", async () => {
    mockBrowserOffline(true);
    const user = userEvent.setup();
    const toastSpy = vi.spyOn(toastModule, "toast");
    const runSpy = vi.spyOn(automationApi, "runBillingAutomation");

    renderAutomationCenter(seedAutomationQueryClient());

    await user.click(screen.getByTestId("automation-run-preview"));

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith({
        title: content.admin.automation.runFailed,
        description: content.admin.automation.offlineHint,
      });
    });
    expect(runSpy).not.toHaveBeenCalled();

    toastSpy.mockRestore();
    runSpy.mockRestore();
  });

  it("shows an offline message when Run Now is clicked while offline", async () => {
    mockBrowserOffline(true);
    const user = userEvent.setup();
    const toastSpy = vi.spyOn(toastModule, "toast");
    const runSpy = vi.spyOn(automationApi, "runBillingAutomation");

    renderAutomationCenter(seedAutomationQueryClient(true));

    await user.click(screen.getByTestId("automation-run-now"));

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith({
        title: content.admin.automation.runFailed,
        description: content.admin.automation.offlineHint,
      });
    });
    expect(screen.queryByTestId("automation-run-now-dialog")).not.toBeInTheDocument();
    expect(runSpy).not.toHaveBeenCalled();

    toastSpy.mockRestore();
    runSpy.mockRestore();
  });
});

describe("AdminAutomationCenter platform admin read-only", () => {
  const scopeLabels: Record<(typeof AUTOMATION_CONFIG_SCOPES)[number], string> = {
    overview: content.admin.automation.scope.overview,
    billingCycle: content.admin.automation.scope.billingCycle,
    invoices: content.admin.automation.scope.invoices,
    paymentReminders: content.admin.automation.scope.paymentReminders,
    followUps: content.admin.automation.scope.followUps,
    expiryRenewal: content.admin.automation.scope.expiryRenewal,
    monthlyReports: content.admin.automation.scope.monthlyReports,
    whatsApp: content.admin.automation.scope.whatsApp,
  };

  function seedReadOnlyQueryClient() {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(
      ["admin", "automation", "config"],
      DEFAULT_PLATFORM_AUTOMATION_CONFIG,
    );
    seedAutomationRunHistoryCache(queryClient, [{ runs: [], total: 0 }]);
    return queryClient;
  }

  function expectNoSaveOrRunActions() {
    expect(screen.queryByTestId("automation-save")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: content.admin.automation.save })).not.toBeInTheDocument();
    expect(screen.queryByTestId("automation-run-preview")).not.toBeInTheDocument();
    expect(screen.queryByTestId("automation-run-now")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: content.admin.automation.runNow })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: content.admin.automation.runDryRun })).not.toBeInTheDocument();
  }

  it("shows read-only hints and disables automation controls on overview", async () => {
    renderAutomationCenter(seedReadOnlyQueryClient(), "PLATFORM_ADMIN");

    await waitFor(() => {
      expect(screen.getByTestId("automation-scope-panel")).toBeInTheDocument();
    });

    expect(screen.getByTestId("admin-read-only-banner")).toBeInTheDocument();
    expect(
      within(screen.getByTestId("automation-scope-panel-mobile")).getByTestId(
        "automation-scope-read-only-hint",
      ),
    ).toHaveTextContent(content.admin.automation.readOnlyHint);
    expect(screen.getByTestId("automation-section-read-only-hint")).toHaveTextContent(
      content.admin.automation.readOnlyHint,
    );
    expectNoSaveOrRunActions();
    expect(screen.getByRole("switch", { name: content.admin.automation.fields.globalEnabled })).toBeDisabled();
    expect(screen.getByLabelText(content.admin.automation.fields.timezone)).toBeDisabled();
  });

  it.each(AUTOMATION_CONFIG_SCOPES)(
    "hides Save and Run actions on the %s tab",
    async (scope) => {
      navigationMocks.searchParams =
        scope === "overview" ? new URLSearchParams("") : new URLSearchParams(`scope=${scope}`);

      renderAutomationCenter(seedReadOnlyQueryClient(), "PLATFORM_ADMIN");

      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: scopeLabels[scope] }),
        ).toBeInTheDocument();
      });

      expectNoSaveOrRunActions();
      expect(screen.getByTestId("automation-section-read-only-hint")).toHaveTextContent(
        content.admin.automation.readOnlyHint,
      );
    },
  );

  it("does not call save or run APIs when read-only", async () => {
    let patchCalls = 0;
    let runCalls = 0;
    server.use(
      http.patch("/api/admin/automation/config", () => {
        patchCalls += 1;
        return HttpResponse.json(DEFAULT_PLATFORM_AUTOMATION_CONFIG);
      }),
      http.post("/api/admin/automation/run", () => {
        runCalls += 1;
        return HttpResponse.json({ status: "SUCCESS", trigger: "DRY_RUN", summary: {} });
      }),
    );

    renderAutomationCenter(seedReadOnlyQueryClient(), "PLATFORM_ADMIN");

    await waitFor(() => {
      expect(screen.getByTestId("automation-scope-panel")).toBeInTheDocument();
    });

    expectNoSaveOrRunActions();
    expect(patchCalls).toBe(0);
    expect(runCalls).toBe(0);
  });
});

describe("AdminAutomationCenter run toast feedback", () => {
  const partialRunResponse: AutomationRunLogDto = {
    id: "run-partial-1",
    trigger: "MANUAL",
    status: "PARTIAL",
    startedAt: "2026-06-01T10:00:00.000Z",
    completedAt: "2026-06-01T10:00:05.000Z",
    summary: {
      invoicesSent: 1,
      invoicesSkipped: 0,
      paymentRemindersSent: 0,
      whatsAppQueued: 0,
      followUpsScheduled: 0,
      renewalRemindersSent: 0,
      expiryWarningsSent: 0,
      monthlyReportsSent: 0,
      paymentConfirmationsSent: 0,
      details: [],
    },
    errors: ["Simulated invoice send failure"],
    triggeredByEmail: "master-admin@test.local",
  };

  function seedRunQueryClient() {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(
      ["admin", "automation", "config"],
      DEFAULT_PLATFORM_AUTOMATION_CONFIG,
    );
    seedAutomationRunHistoryCache(queryClient, [{ runs: [], total: 0 }]);
    return queryClient;
  }

  it("shows a warning toast when a preview run completes with PARTIAL status", async () => {
    const user = userEvent.setup();
    const toastSpy = vi.spyOn(toastModule, "toast");

    server.use(
      http.post("/api/admin/automation/run", () => HttpResponse.json(partialRunResponse)),
    );

    renderAutomationCenter(seedRunQueryClient());

    await user.click(screen.getByTestId("automation-run-preview"));

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith({
        title: content.admin.automation.runPartialSuccess,
        description: expect.stringContaining("Simulated invoice send failure"),
      });
    });
    expect(toastSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ title: content.admin.automation.runDryRunSuccess }),
    );
    expect(toastSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ title: content.admin.automation.runSuccess }),
    );

    toastSpy.mockRestore();
  });

  it("shows a warning toast when Run Now completes with PARTIAL status", async () => {
    const user = userEvent.setup();
    const toastSpy = vi.spyOn(toastModule, "toast");
    const enabledConfig = {
      ...DEFAULT_PLATFORM_AUTOMATION_CONFIG,
      global: {
        ...DEFAULT_PLATFORM_AUTOMATION_CONFIG.global,
        enabled: true,
      },
    };

    const queryClient = seedRunQueryClient();
    queryClient.setQueryData(["admin", "automation", "config"], enabledConfig);

    server.use(
      http.post("/api/admin/automation/run", () => HttpResponse.json(partialRunResponse)),
    );

    renderAutomationCenter(queryClient);

    await confirmAutomationLiveRun(user);

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith({
        title: content.admin.automation.runPartialSuccess,
        description: expect.stringContaining("Simulated invoice send failure"),
      });
    });
    expect(toastSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ title: content.admin.automation.runSuccess }),
    );

    toastSpy.mockRestore();
  });

  it("shows the dry run mode banner when dry run mode is saved on", async () => {
    const queryClient = seedRunQueryClient();
    queryClient.setQueryData(["admin", "automation", "config"], {
      ...DEFAULT_PLATFORM_AUTOMATION_CONFIG,
      global: {
        ...DEFAULT_PLATFORM_AUTOMATION_CONFIG.global,
        enabled: true,
        dryRunMode: true,
      },
    });

    renderAutomationCenter(queryClient);

    await waitFor(() => {
      expect(screen.getByTestId("automation-dry-run-mode-banner")).toBeInTheDocument();
    });
    expect(screen.getByTestId("automation-dry-run-mode-banner")).toHaveTextContent(
      content.admin.automation.dryRunModeActiveBanner,
    );
  });

  it("shows a dry-run forced warning toast when Run Now is downgraded by dry run mode", async () => {
    const user = userEvent.setup();
    const toastSpy = vi.spyOn(toastModule, "toast");
    const forcedDryRunResponse: AutomationRunLogDto = {
      ...sampleHistoryRun,
      id: "run-forced-dry-run",
      trigger: "DRY_RUN",
      status: "SUCCESS",
    };

    const queryClient = seedRunQueryClient();
    queryClient.setQueryData(["admin", "automation", "config"], {
      ...DEFAULT_PLATFORM_AUTOMATION_CONFIG,
      global: {
        ...DEFAULT_PLATFORM_AUTOMATION_CONFIG.global,
        enabled: true,
        dryRunMode: true,
      },
    });

    server.use(
      http.post("/api/admin/automation/run", () => HttpResponse.json(forcedDryRunResponse)),
    );

    renderAutomationCenter(queryClient);

    await confirmAutomationLiveRun(user);

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith({
        title: content.admin.automation.runDryRunForced,
        description: expect.stringContaining(content.admin.automation.runDryRunForcedHint),
      });
    });
    expect(toastSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ title: content.admin.automation.runSuccess }),
    );
    expect(toastSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ title: content.admin.automation.runDryRunSuccess }),
    );

    toastSpy.mockRestore();
  });

  it("shows a normal dry-run success toast for preview runs", async () => {
    const user = userEvent.setup();
    const toastSpy = vi.spyOn(toastModule, "toast");
    const previewRunResponse: AutomationRunLogDto = {
      ...sampleHistoryRun,
      id: "run-preview",
      trigger: "DRY_RUN",
      status: "SUCCESS",
    };

    server.use(
      http.post("/api/admin/automation/run", () => HttpResponse.json(previewRunResponse)),
    );

    renderAutomationCenter(seedRunQueryClient());

    await user.click(screen.getByTestId("automation-run-preview"));

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith({
        title: content.admin.automation.runDryRunSuccess,
        description: expect.any(String),
      });
    });
    expect(toastSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ title: content.admin.automation.runDryRunForced }),
    );

    toastSpy.mockRestore();
  });

  it("shows the WhatsApp queue-only banner when the Business API is not connected", async () => {
    renderAutomationCenter(seedRunQueryClient());

    await waitFor(() => {
      expect(screen.getByTestId("automation-whatsapp-queue-banner")).toBeInTheDocument();
    });
    expect(screen.getByTestId("automation-whatsapp-queue-banner")).toHaveTextContent(
      content.admin.automation.whatsAppQueueOnlyBanner,
    );
  });

  it("includes WhatsApp queue guidance in the run toast when reminders were queued", async () => {
    const user = userEvent.setup();
    const toastSpy = vi.spyOn(toastModule, "toast");
    const queuedRunResponse: AutomationRunLogDto = {
      ...sampleHistoryRun,
      id: "run-whatsapp-queued",
      trigger: "MANUAL",
      status: "SUCCESS",
      summary: {
        ...sampleHistoryRun.summary,
        whatsAppQueued: 1,
      },
    };

    server.use(
      http.post("/api/admin/automation/run", () => HttpResponse.json(queuedRunResponse)),
    );

    renderAutomationCenter(seedRunQueryClient());

    await user.click(screen.getByTestId("automation-run-preview"));

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith({
        title: content.admin.automation.runDryRunSuccess,
        description: expect.stringContaining(content.admin.automation.runWhatsAppQueuedHint),
      });
    });

    toastSpy.mockRestore();
  });
});

describe("AdminAutomationCenter timezone sync", () => {
  function seedTimezoneQueryClient(automationTimezone: string) {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(["admin", "automation", "config"], {
      ...DEFAULT_PLATFORM_AUTOMATION_CONFIG,
      global: {
        ...DEFAULT_PLATFORM_AUTOMATION_CONFIG.global,
        timezone: automationTimezone,
      },
    });
    seedAutomationRunHistoryCache(queryClient, [{ runs: [], total: 0 }]);
    return queryClient;
  }

  it("shows synced guidance when automation timezone matches Master Settings", async () => {
    renderAutomationCenter(seedTimezoneQueryClient("Asia/Kolkata"));

    await waitFor(() => {
      expect(screen.getByLabelText(content.admin.automation.fields.timezone)).toHaveValue(
        "Asia/Kolkata",
      );
    });
    expect(screen.queryByTestId("automation-timezone-drift-banner")).not.toBeInTheDocument();
    expect(screen.getByText(content.admin.automation.fields.timezoneSyncedHint)).toBeInTheDocument();
  });

  it("shows a drift banner when automation timezone differs from Master Settings", async () => {
    platformSettingsResponse = structuredClone(defaultPlatformSettingsResponse);
    platformSettingsResponse.settings.general.defaultTimezone = "America/New_York";

    renderAutomationCenter(
      seedTimezoneQueryClient("Asia/Kolkata"),
      "MASTER_ADMIN",
      {
        ...DEFAULT_PLATFORM_SETTINGS,
        general: {
          ...DEFAULT_PLATFORM_SETTINGS.general,
          defaultTimezone: "America/New_York",
        },
      },
    );

    await waitFor(() => {
      expect(screen.getByTestId("automation-timezone-drift-banner")).toBeInTheDocument();
    });
    expect(screen.getByTestId("automation-timezone-drift-banner")).toHaveTextContent(
      content.admin.automation.fields.timezoneDriftMessage
        .replace("{automationTimezone}", "Asia/Kolkata")
        .replace("{platformTimezone}", "America/New_York"),
    );
    expect(
      screen.getByText(
        content.admin.automation.fields.timezoneHint.replace(
          "{platformTimezone}",
          "America/New_York",
        ),
      ),
    ).toBeInTheDocument();
  });

  it("syncs automation timezone from Master Settings when Use platform timezone is clicked", async () => {
    const user = userEvent.setup();
    platformSettingsResponse = structuredClone(defaultPlatformSettingsResponse);
    platformSettingsResponse.settings.general.defaultTimezone = "America/New_York";

    const updateSpy = vi.spyOn(automationApi, "updateAutomationConfig");

    renderAutomationCenter(
      seedTimezoneQueryClient("Asia/Kolkata"),
      "MASTER_ADMIN",
      {
        ...DEFAULT_PLATFORM_SETTINGS,
        general: {
          ...DEFAULT_PLATFORM_SETTINGS.general,
          defaultTimezone: "America/New_York",
        },
      },
    );

    await waitFor(() => {
      expect(screen.getByTestId("automation-timezone-sync")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("automation-timezone-sync"));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith({
        global: {
          ...DEFAULT_PLATFORM_AUTOMATION_CONFIG.global,
          timezone: "America/New_York",
        },
      });
    });
    await waitFor(() => {
      expect(screen.getByLabelText(content.admin.automation.fields.timezone)).toHaveValue(
        "America/New_York",
      );
    });
    expect(screen.queryByTestId("automation-timezone-drift-banner")).not.toBeInTheDocument();

    updateSpy.mockRestore();
  });

  it("hides the sync action for read-only platform admins but keeps drift guidance visible", async () => {
    platformSettingsResponse = structuredClone(defaultPlatformSettingsResponse);
    platformSettingsResponse.settings.general.defaultTimezone = "America/New_York";

    renderAutomationCenter(
      seedTimezoneQueryClient("Asia/Kolkata"),
      "PLATFORM_ADMIN",
      {
        ...DEFAULT_PLATFORM_SETTINGS,
        general: {
          ...DEFAULT_PLATFORM_SETTINGS.general,
          defaultTimezone: "America/New_York",
        },
      },
    );

    await waitFor(() => {
      expect(screen.getByTestId("automation-timezone-drift-banner")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("automation-timezone-sync")).not.toBeInTheDocument();
  });
});

describe("AdminAutomationCenter run history", () => {
  function seedConfigQueryClient() {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: Infinity, refetchOnMount: false },
        mutations: { retry: false },
      },
    });
    queryClient.setQueryData(
      ["admin", "automation", "config"],
      DEFAULT_PLATFORM_AUTOMATION_CONFIG,
    );
    return queryClient;
  }

  it("shows an empty state when run history has loaded with no entries", async () => {
    navigationMocks.searchParams = new URLSearchParams("scope=history");

    const queryClient = seedConfigQueryClient();
    seedAutomationRunHistoryCache(queryClient, [{ runs: [], total: 0 }]);

    renderAutomationCenter(queryClient);

    await waitFor(() => {
      expect(screen.getByTestId("automation-history-empty")).toBeInTheDocument();
    });
    expect(
      screen.getByRole("heading", {
        name: content.admin.automation.history.emptyTitle,
        level: 3,
      }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("automation-history-empty-description")).toHaveTextContent(
      content.admin.automation.history.emptyDescription,
    );
    expect(screen.getByText(content.admin.automation.history.emptyCronHint)).toBeInTheDocument();
    expect(screen.queryByTestId("automation-history-loading")).not.toBeInTheDocument();
  });

  it("shows read-only empty guidance on the history tab for platform admins", async () => {
    navigationMocks.searchParams = new URLSearchParams("scope=history");

    const queryClient = seedConfigQueryClient();
    seedAutomationRunHistoryCache(queryClient, [{ runs: [], total: 0 }]);

    renderAutomationCenter(queryClient, "PLATFORM_ADMIN");

    await waitFor(() => {
      expect(screen.getByTestId("automation-history-empty")).toBeInTheDocument();
    });
    expect(screen.getByTestId("automation-history-empty-description")).toHaveTextContent(
      content.admin.automation.history.emptyReadOnlyDescription,
    );
    expect(
      screen.queryByText(content.admin.automation.history.emptyCronHint),
    ).not.toBeInTheDocument();
  });

  it("shows cached run history without reloading", async () => {
    navigationMocks.searchParams = new URLSearchParams("scope=history");

    const queryClient = seedConfigQueryClient();
    seedAutomationRunHistoryCache(queryClient, [{ runs: [sampleHistoryRun], total: 1 }]);

    renderAutomationCenter(queryClient);

    await waitFor(() => {
      expect(screen.getByTestId("automation-history-list")).toBeInTheDocument();
    });
    expect(screen.getByText("DRY_RUN")).toBeInTheDocument();
    expect(screen.queryByTestId("automation-history-loading")).not.toBeInTheDocument();
    expect(screen.queryByTestId("automation-history-load-more")).not.toBeInTheDocument();
  });

  it("shows a warning badge and warning errors for partial runs in history", async () => {
    navigationMocks.searchParams = new URLSearchParams("scope=history");

    const queryClient = seedConfigQueryClient();
    seedAutomationRunHistoryCache(queryClient, [
      {
        runs: [
          {
            ...sampleHistoryRun,
            id: "history-partial-run",
            status: "PARTIAL",
            errors: ["Simulated invoice send failure"],
          },
        ],
        total: 1,
      },
    ]);

    renderAutomationCenter(queryClient);

    await waitFor(() => {
      expect(screen.getByTestId("automation-history-list")).toBeInTheDocument();
    });

    const badge = screen.getByTestId("automation-run-status-PARTIAL");
    expect(badge.className).toContain("text-status-warning");
    expect(screen.getByText("Simulated invoice send failure").className).toContain(
      "text-status-warning",
    );
  });

  it("shows load more when the first page does not include all runs", async () => {
    navigationMocks.searchParams = new URLSearchParams("scope=history");

    const pageOneRuns = Array.from({ length: 20 }, (_, index) => ({
      ...sampleHistoryRun,
      id: `history-run-${index + 1}`,
      trigger: "CRON" as const,
    }));

    const queryClient = seedConfigQueryClient();
    seedAutomationRunHistoryCache(queryClient, [{ runs: pageOneRuns, total: 25 }]);

    renderAutomationCenter(queryClient);

    await waitFor(() => {
      expect(screen.getByTestId("automation-history-load-more")).toBeInTheDocument();
    });
    expect(screen.getAllByText("CRON")).toHaveLength(20);
    expect(screen.getByTestId("automation-history-showing")).toHaveTextContent(
      content.admin.automation.history.showingRuns
        .replace("{shown}", "20")
        .replace("{total}", "25"),
    );
  });

  it("shows an error banner with retry when run history fails to load", async () => {
    navigationMocks.searchParams = new URLSearchParams("scope=history");

    server.use(
      http.get(/\/api\/admin\/automation\/runs/, () =>
        HttpResponse.json({ message: "Server error" }, { status: 500 }),
      ),
    );

    renderAutomationCenter(seedConfigQueryClient());

    await waitFor(() => {
      expect(screen.getByTestId("automation-history-error")).toBeInTheDocument();
    });
    const banner = screen.getByTestId("automation-history-error");
    expect(banner).toHaveAttribute("role", "alert");
    expect(banner).toHaveTextContent(content.admin.automation.history.loadFailed);
    expect(within(banner).getByRole("button", { name: content.admin.automation.retry })).toBeEnabled();
    expect(screen.queryByTestId("automation-history-loading")).not.toBeInTheDocument();
    expect(screen.queryByTestId("automation-history-empty")).not.toBeInTheDocument();
  });

  it("shows a load-more error banner when fetching additional pages fails", async () => {
    const user = userEvent.setup();
    navigationMocks.searchParams = new URLSearchParams("scope=history");

    const pageOneRuns = Array.from({ length: 20 }, (_, index) => ({
      ...sampleHistoryRun,
      id: `history-run-${index + 1}`,
      trigger: "CRON" as const,
    }));

    const queryClient = seedConfigQueryClient();
    seedAutomationRunHistoryCache(queryClient, [{ runs: pageOneRuns, total: 25 }]);

    server.use(
      http.get(/\/api\/admin\/automation\/runs/, ({ request }) => {
        const url = new URL(request.url);
        const page = Number.parseInt(url.searchParams.get("page") ?? "1", 10);
        if (page === 1) {
          return HttpResponse.json({ runs: pageOneRuns, total: 25 });
        }
        return HttpResponse.json({ message: "Server error" }, { status: 500 });
      }),
    );

    renderAutomationCenter(queryClient);

    await waitFor(() => {
      expect(screen.getByTestId("automation-history-load-more")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("automation-history-load-more"));

    await waitFor(() => {
      expect(screen.getByTestId("automation-history-load-more-error")).toBeInTheDocument();
    });

    const banner = screen.getByTestId("automation-history-load-more-error");
    expect(banner).toHaveAttribute("role", "alert");
    expect(banner).toHaveTextContent(content.admin.automation.history.loadMoreFailed);
    expect(within(banner).getByRole("button", { name: content.admin.automation.retry })).toBeEnabled();
    expect(screen.getByTestId("automation-history-list")).toBeInTheDocument();
    expect(screen.getAllByText("CRON")).toHaveLength(20);
    expect(screen.queryByTestId("automation-history-error")).not.toBeInTheDocument();
  });

  it("shows a new run in history immediately after Run Preview from overview", async () => {
    const user = userEvent.setup();
    const createdRun: AutomationRunLogDto = {
      ...sampleHistoryRun,
      id: "run-after-preview",
      trigger: "DRY_RUN",
    };

    server.use(
      http.post("/api/admin/automation/run", () => HttpResponse.json(createdRun)),
    );

    renderAutomationCenter(seedConfigQueryClient());

    await user.click(screen.getByTestId("automation-run-preview"));

    const historyTabs = screen.getAllByRole("tab", {
      name: content.admin.automation.scope.history,
    });
    await user.click(historyTabs[0]!);

    await waitFor(() => {
      expect(screen.getByTestId("automation-history-list")).toBeInTheDocument();
    });
    expect(screen.getByText("DRY_RUN")).toBeInTheDocument();
    expect(screen.queryByTestId("automation-history-empty")).not.toBeInTheDocument();
    expect(screen.queryByTestId("automation-history-loading")).not.toBeInTheDocument();
  });

  it("formats run history timestamps using the overview timezone setting", async () => {
    navigationMocks.searchParams = new URLSearchParams("scope=history");

    const startedAt = "2026-06-01T10:00:00.000Z";
    const queryClient = seedConfigQueryClient();
    queryClient.setQueryData(["admin", "automation", "config"], {
      ...DEFAULT_PLATFORM_AUTOMATION_CONFIG,
      global: {
        ...DEFAULT_PLATFORM_AUTOMATION_CONFIG.global,
        timezone: "America/New_York",
      },
    });
    seedAutomationRunHistoryCache(queryClient, [
      { runs: [{ ...sampleHistoryRun, startedAt }], total: 1 },
    ]);

    renderAutomationCenter(queryClient);

    await waitFor(() => {
      expect(screen.getByTestId("automation-history-list")).toBeInTheDocument();
    });
    expect(
      screen.getByText(formatDateTimeInTimezone(startedAt, "America/New_York")),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(formatDateTimeInTimezone(startedAt, "Asia/Kolkata")),
    ).not.toBeInTheDocument();
  });
});

describe("AdminAutomationCenter mobile layout (375px)", () => {
  const scopeLabels: Record<(typeof AUTOMATION_CONFIG_SCOPES)[number] | "history", string> = {
    overview: content.admin.automation.scope.overview,
    billingCycle: content.admin.automation.scope.billingCycle,
    invoices: content.admin.automation.scope.invoices,
    paymentReminders: content.admin.automation.scope.paymentReminders,
    followUps: content.admin.automation.scope.followUps,
    expiryRenewal: content.admin.automation.scope.expiryRenewal,
    monthlyReports: content.admin.automation.scope.monthlyReports,
    whatsApp: content.admin.automation.scope.whatsApp,
    history: content.admin.automation.scope.history,
  };

  const allScopes = [...AUTOMATION_CONFIG_SCOPES, "history"] as const;

  beforeEach(() => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 375,
    });
  });

  it("applies overflow-safe root and full-bleed nav classes on overview", async () => {
    renderAutomationCenter();

    await waitFor(() => {
      expect(screen.getByTestId("automation-center-root")).toBeInTheDocument();
    });

    expect(screen.getByTestId("automation-center-root")).toHaveClass(
      ...AUTOMATION_CENTER_ROOT_CLASS.split(" "),
    );
    expect(screen.getByRole("navigation", { name: "Admin dashboard" })).toHaveClass(
      ...AUTOMATION_CENTER_NAV_CLASS.split(" "),
    );
    expect(screen.getByTestId("automation-center-content")).toBeInTheDocument();
  });

  it.each(allScopes)("renders the %s tab with mobile-safe layout shell", async (scope) => {
    navigationMocks.searchParams =
      scope === "overview" ? new URLSearchParams("") : new URLSearchParams(`scope=${scope}`);

    renderAutomationCenter();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: scopeLabels[scope] })).toBeInTheDocument();
    });

    expect(screen.getByTestId("automation-center-root")).toHaveClass("overflow-x-hidden");
    expect(screen.getByTestId("automation-center-content")).toHaveClass("min-w-0");
    expect(screen.getByTestId("automation-scope-scroll")).toHaveClass("min-w-0");
    expect(screen.getByTestId("automation-scope-scroll")).toHaveClass("max-w-full");
  });

  it("stacks overview run actions full-width on mobile", async () => {
    renderAutomationCenter();

    await waitFor(() => {
      expect(screen.getByTestId("automation-run-preview")).toBeInTheDocument();
    });

    expect(screen.getByTestId("automation-run-preview")).toHaveClass(
      ...AUTOMATION_MOBILE_FULL_WIDTH_BUTTON_CLASS.split(" "),
    );
    expect(screen.getByTestId("automation-run-now")).toHaveClass(
      ...AUTOMATION_MOBILE_FULL_WIDTH_BUTTON_CLASS.split(" "),
    );
  });

  it("stacks save actions full-width on config tabs", async () => {
    navigationMocks.searchParams = new URLSearchParams("scope=billingCycle");

    renderAutomationCenter();

    await waitFor(() => {
      expect(screen.getByTestId("automation-save")).toBeInTheDocument();
    });

    expect(screen.getByTestId("automation-save")).toHaveClass(
      ...AUTOMATION_MOBILE_FULL_WIDTH_BUTTON_CLASS.split(" "),
    );
  });
});

describe("AutomationCenterLoadingShell mobile layout", () => {
  it("uses the same overflow-safe root shell as the loaded center", () => {
    render(
      <AutomationCenterLoadingShell
        admin={content.admin}
        loadingLabel={content.admin.automation.loading}
      />,
    );

    expect(screen.getByTestId("automation-center-loading")).toHaveClass(
      ...AUTOMATION_CENTER_ROOT_CLASS.split(" "),
    );
    expect(screen.getByTestId("automation-center-content")).toBeInTheDocument();
  });
});

describe("AutomationCenterErrorShell mobile layout", () => {
  it("uses the same overflow-safe root shell as the loaded center", () => {
    render(
      <AutomationCenterErrorShell
        admin={content.admin}
        message={content.admin.automation.loadFailed}
        retryLabel={content.admin.automation.retry}
        onRetry={() => undefined}
      />,
    );

    expect(screen.getByTestId("automation-center-error")).toHaveClass(
      ...AUTOMATION_CENTER_ROOT_CLASS.split(" "),
    );
  });
});

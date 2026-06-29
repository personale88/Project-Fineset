// @vitest-environment jsdom
import { describe, expect, it, beforeAll, afterAll, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import type { AutomationRunLogDto } from "@/lib/automation/types";
import { AUTOMATION_RUNS_QUERY_KEY, automationRunsQueryKey } from "@/lib/automation/runs-query";
import { useAutomationConfig, useAutomationRunHistory, useAutomationRuns, useRunBillingAutomation } from "./useAutomation";
import { DEFAULT_PLATFORM_AUTOMATION_CONFIG } from "@/lib/automation/default-config";

const createdRun: AutomationRunLogDto = {
  id: "run-created",
  trigger: "MANUAL",
  status: "SUCCESS",
  startedAt: "2026-06-01T10:00:00.000Z",
  completedAt: "2026-06-01T10:00:05.000Z",
  summary: {
    invoicesSent: 2,
    invoicesSkipped: 0,
    paymentRemindersSent: 1,
    whatsAppQueued: 0,
    followUpsScheduled: 3,
    renewalRemindersSent: 0,
    expiryWarningsSent: 0,
    monthlyReportsSent: 0,
    paymentConfirmationsSent: 0,
    details: [],
  },
  errors: null,
  triggeredByEmail: "master-admin@test.local",
};

let historyRuns: AutomationRunLogDto[] = [];

const server = setupServer(
  http.get("/api/admin/automation/config", () =>
    HttpResponse.json(DEFAULT_PLATFORM_AUTOMATION_CONFIG),
  ),
  http.get("/api/admin/automation/runs", () =>
    HttpResponse.json({ runs: historyRuns, total: historyRuns.length }),
  ),
  http.post("/api/admin/automation/run", () => {
    historyRuns = [createdRun];
    return HttpResponse.json(createdRun);
  }),
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  historyRuns = [];
});
afterAll(() => server.close());

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return {
    queryClient,
    Wrapper({ children }: { children: React.ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    },
  };
}

describe("useAutomationConfig", () => {
  it("enters error status when the config request fails with a network error", async () => {
    server.use(
      http.get("/api/admin/automation/config", () => HttpResponse.error()),
    );

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useAutomationConfig(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.error).toBeTruthy();
    expect(result.current.data).toBeUndefined();
  });

  it("recovers after refetchQueries when the initial config load failed", async () => {
    let configNetworkError = true;
    server.use(
      http.get("/api/admin/automation/config", () => {
        if (configNetworkError) {
          return HttpResponse.error();
        }
        return HttpResponse.json(DEFAULT_PLATFORM_AUTOMATION_CONFIG);
      }),
    );

    const { queryClient, Wrapper } = createWrapper();
    const { result } = renderHook(() => useAutomationConfig(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.status).toBe("error"));

    configNetworkError = false;
    await queryClient.refetchQueries({
      queryKey: ["admin", "automation", "config"],
      type: "active",
    });

    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(result.current.data).toEqual(DEFAULT_PLATFORM_AUTOMATION_CONFIG);
  });
});

describe("useAutomationRuns", () => {
  it("does not fetch when disabled", async () => {
    let fetchCount = 0;
    server.use(
      http.get("/api/admin/automation/runs", () => {
        fetchCount += 1;
        return HttpResponse.json({ runs: [], total: 0 });
      }),
    );

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useAutomationRuns(1, { enabled: false }), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
    expect(fetchCount).toBe(0);
    expect(result.current.isPending).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it("stays pending until the runs request resolves", async () => {
    let resolveRuns: (() => void) | undefined;
    const runsDeferred = new Promise<void>((resolve) => {
      resolveRuns = resolve;
    });

    server.use(
      http.get(/\/api\/admin\/automation\/runs/, async () => {
        await runsDeferred;
        return HttpResponse.json({ runs: [], total: 0 });
      }),
    );

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useAutomationRuns(1, { enabled: true }), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.fetchStatus).toBe("fetching"));
    expect(result.current.isPending).toBe(true);

    resolveRuns!();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ runs: [], total: 0 });
  });

  it("enters error status when the runs request fails", async () => {
    server.use(
      http.get(/\/api\/admin\/automation\/runs/, () =>
        HttpResponse.json({ message: "Server error" }, { status: 500 }),
      ),
    );

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useAutomationRunHistory({ enabled: true }), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.error).toBeTruthy();
  });

  it("recovers after refetch when the initial load failed", async () => {
    let shouldFail = true;
    server.use(
      http.get(/\/api\/admin\/automation\/runs/, () => {
        if (shouldFail) {
          return HttpResponse.json({ message: "Server error" }, { status: 500 });
        }
        return HttpResponse.json({ runs: [createdRun], total: 1 });
      }),
    );

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useAutomationRunHistory({ enabled: true }), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.status).toBe("error"));

    shouldFail = false;
    await result.current.refetch();

    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(result.current.data?.pages[0]?.runs).toEqual([createdRun]);
  });
});

describe("useAutomationRunHistory", () => {
  it("surfaces fetchNextPage errors when loading additional pages fails", async () => {
    const pageOneRuns = Array.from({ length: 20 }, (_, index) => ({
      ...createdRun,
      id: `run-page-1-${index + 1}`,
    }));

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

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useAutomationRunHistory({ enabled: true }), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.data?.pages).toHaveLength(1));
    expect(result.current.hasNextPage).toBe(true);

    const fetchResult = await result.current.fetchNextPage();

    expect(fetchResult.isError).toBe(true);
    expect(fetchResult.error).toBeTruthy();
    expect(result.current.data?.pages).toHaveLength(1);
    expect(result.current.data?.pages[0]?.runs).toHaveLength(20);
  });

  it("loads additional pages when fetchNextPage is called", async () => {
    const pageOneRuns = Array.from({ length: 20 }, (_, index) => ({
      ...createdRun,
      id: `run-page-1-${index + 1}`,
    }));
    const pageTwoRuns = Array.from({ length: 5 }, (_, index) => ({
      ...createdRun,
      id: `run-page-2-${index + 1}`,
    }));

    server.use(
      http.get(/\/api\/admin\/automation\/runs/, ({ request }) => {
        const url = new URL(request.url);
        const page = Number.parseInt(url.searchParams.get("page") ?? "1", 10);
        if (page === 1) {
          return HttpResponse.json({ runs: pageOneRuns, total: 25 });
        }
        return HttpResponse.json({ runs: pageTwoRuns, total: 25 });
      }),
    );

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useAutomationRunHistory({ enabled: true }), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.data?.pages).toHaveLength(1));
    expect(result.current.data?.pages[0]?.runs).toHaveLength(20);
    expect(result.current.hasNextPage).toBe(true);

    await result.current.fetchNextPage();

    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));
    expect(result.current.data?.pages[1]?.runs).toHaveLength(5);
    expect(result.current.hasNextPage).toBe(false);
  });
});

describe("useRunBillingAutomation", () => {
  it("prepends the completed run to the history query cache", async () => {
    const { queryClient, Wrapper } = createWrapper();

    const { result: runsResult } = renderHook(() => useAutomationRuns(), {
      wrapper: Wrapper,
    });
    const { result: runMutationResult } = renderHook(() => useRunBillingAutomation(), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(runsResult.current.isSuccess).toBe(true));
    expect(runsResult.current.data?.runs).toEqual([]);

    await runMutationResult.current.mutateAsync({ dryRun: true });

    await waitFor(() => expect(runsResult.current.data?.runs).toEqual([createdRun]));
    expect(queryClient.getQueryData(automationRunsQueryKey(1))).toEqual({
      runs: [createdRun],
      total: 1,
    });
    expect(queryClient.getQueryData(AUTOMATION_RUNS_QUERY_KEY)).toEqual({
      pages: [{ runs: [createdRun], total: 1 }],
      pageParams: [1],
    });
  });

  it("keeps the prepended run when run history enables after a manual run", async () => {
    server.use(
      http.get("/api/admin/automation/runs", () =>
        HttpResponse.json({ runs: [], total: 0 }),
      ),
    );

    const { queryClient, Wrapper } = createWrapper();

    renderHook(() => useAutomationRunHistory({ enabled: false }), {
      wrapper: Wrapper,
    });
    const { result: runMutationResult } = renderHook(() => useRunBillingAutomation(), {
      wrapper: Wrapper,
    });

    await runMutationResult.current.mutateAsync({ dryRun: true });

    expect(queryClient.getQueryData(AUTOMATION_RUNS_QUERY_KEY)).toEqual({
      pages: [{ runs: [createdRun], total: 1 }],
      pageParams: [1],
    });

    const { result: historyResult } = renderHook(
      () => useAutomationRunHistory({ enabled: true }),
      { wrapper: Wrapper },
    );

    await waitFor(() =>
      expect(historyResult.current.data?.pages[0]?.runs).toEqual([createdRun]),
    );
    expect(historyResult.current.data?.pages[0]?.total).toBe(1);
  });
});

// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { content } from "@/content/en";
import { formatDateTimeInTimezone } from "@/lib/automation/timezone";
import { AutomationHistoryPanel, automationRunStatusBadgeVariant } from "@/components/admin/automation/AutomationHistoryPanel";
import type { AutomationRunLogDto } from "@/lib/automation/types";

const copy = content.admin.automation;
const timezone = "Asia/Kolkata";

afterEach(() => {
  cleanup();
});

const sampleRun: AutomationRunLogDto = {
  id: "run-1",
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

describe("AutomationHistoryPanel", () => {
  it("shows a spinner, label, and skeleton rows while loading", () => {
    render(
      <AutomationHistoryPanel
        copy={copy}
        timezone={timezone}
        isLoading
        isEmpty={false}
        isError={false}
        onRetry={vi.fn()}
      />,
    );

    const loading = screen.getByTestId("automation-history-loading");
    expect(loading).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText(copy.history.loading)).toBeInTheDocument();
  });

  it("does not show an empty state before history has loaded", () => {
    render(
      <AutomationHistoryPanel
        copy={copy}
        timezone={timezone}
        runs={undefined}
        isLoading={false}
        isEmpty={false}
        isError={false}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.queryByTestId("automation-history-empty")).not.toBeInTheDocument();
    expect(screen.queryByTestId("automation-history-loading")).not.toBeInTheDocument();
  });

  it("shows a helpful empty state for editors when there are no runs", () => {
    render(
      <AutomationHistoryPanel
        copy={copy}
        timezone={timezone}
        runs={[]}
        isLoading={false}
        isEmpty
        isError={false}
        canEdit
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByTestId("automation-history-empty")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: copy.history.emptyTitle, level: 3 }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("automation-history-empty-description")).toHaveTextContent(
      copy.history.emptyDescription,
    );
    expect(screen.getByText(copy.history.emptyCronHint)).toBeInTheDocument();
  });

  it("shows read-only empty guidance for platform admins", () => {
    render(
      <AutomationHistoryPanel
        copy={copy}
        timezone={timezone}
        runs={[]}
        isLoading={false}
        isEmpty
        isError={false}
        canEdit={false}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByTestId("automation-history-empty-description")).toHaveTextContent(
      copy.history.emptyReadOnlyDescription,
    );
    expect(screen.queryByText(copy.history.emptyCronHint)).not.toBeInTheDocument();
  });

  it("shows an error banner with retry when history fails to load", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    render(
      <AutomationHistoryPanel
        copy={copy}
        timezone={timezone}
        isLoading={false}
        isEmpty={false}
        isError
        onRetry={onRetry}
      />,
    );

    const banner = screen.getByTestId("automation-history-error");
    expect(banner).toHaveAttribute("role", "alert");
    expect(banner).toHaveTextContent(copy.history.loadFailed);
    await user.click(screen.getByRole("button", { name: copy.retry }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("shows a load-more error banner above the list", async () => {
    const user = userEvent.setup();
    const onRetryLoadMore = vi.fn();
    const runs = Array.from({ length: 20 }, (_, index) => ({
      ...sampleRun,
      id: `run-${index + 1}`,
    }));

    render(
      <AutomationHistoryPanel
        copy={copy}
        timezone={timezone}
        runs={runs}
        total={25}
        isLoading={false}
        isEmpty={false}
        isError={false}
        loadMoreError
        hasMore
        onLoadMore={vi.fn()}
        onRetry={vi.fn()}
        onRetryLoadMore={onRetryLoadMore}
      />,
    );

    const banner = screen.getByTestId("automation-history-load-more-error");
    expect(banner).toHaveAttribute("role", "alert");
    expect(banner).toHaveTextContent(copy.history.loadMoreFailed);
    await user.click(screen.getByRole("button", { name: copy.retry }));
    expect(onRetryLoadMore).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("automation-history-list")).toBeInTheDocument();
  });

  it("renders run history rows", () => {
    render(
      <AutomationHistoryPanel
        copy={copy}
        timezone={timezone}
        runs={[sampleRun]}
        total={1}
        isLoading={false}
        isEmpty={false}
        isError={false}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByTestId("automation-history-list")).toBeInTheDocument();
    expect(screen.getByText("SUCCESS")).toBeInTheDocument();
    expect(screen.getByText("MANUAL")).toBeInTheDocument();
    expect(screen.queryByTestId("automation-history-load-more")).not.toBeInTheDocument();
  });

  it("shows a load more button when additional runs are available", async () => {
    const user = userEvent.setup();
    const onLoadMore = vi.fn();
    const runs = Array.from({ length: 20 }, (_, index) => ({
      ...sampleRun,
      id: `run-${index + 1}`,
    }));

    render(
      <AutomationHistoryPanel
        copy={copy}
        timezone={timezone}
        runs={runs}
        total={25}
        isLoading={false}
        isEmpty={false}
        isError={false}
        hasMore
        onLoadMore={onLoadMore}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByTestId("automation-history-showing")).toHaveTextContent(
      copy.history.showingRuns.replace("{shown}", "20").replace("{total}", "25"),
    );
    await user.click(screen.getByRole("button", { name: copy.history.loadMore }));
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it("hides the load more button when all runs are shown", () => {
    render(
      <AutomationHistoryPanel
        copy={copy}
        timezone={timezone}
        runs={[sampleRun]}
        total={1}
        isLoading={false}
        isEmpty={false}
        isError={false}
        hasMore={false}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.queryByTestId("automation-history-load-more")).not.toBeInTheDocument();
    expect(screen.queryByTestId("automation-history-showing")).not.toBeInTheDocument();
  });

  it("shows a distinct gold badge for running jobs", () => {
    render(
      <AutomationHistoryPanel
        copy={copy}
        timezone={timezone}
        runs={[{ ...sampleRun, status: "RUNNING", completedAt: null }]}
        total={1}
        isLoading={false}
        isEmpty={false}
        isError={false}
        onRetry={vi.fn()}
      />,
    );

    const badge = screen.getByTestId("automation-run-status-RUNNING");
    expect(badge).toHaveTextContent("RUNNING");
    expect(badge.className).toContain("text-brand-gold");
    expect(badge.className).toContain("border-brand-gold/50");
    expect(badge.className).toContain("ring-brand-gold/25");
  });

  it("shows partial run errors with warning styling", () => {
    render(
      <AutomationHistoryPanel
        copy={copy}
        timezone={timezone}
        runs={[
          {
            ...sampleRun,
            status: "PARTIAL",
            errors: ["Simulated invoice send failure"],
          },
        ]}
        total={1}
        isLoading={false}
        isEmpty={false}
        isError={false}
        onRetry={vi.fn()}
      />,
    );

    const badge = screen.getByTestId("automation-run-status-PARTIAL");
    expect(badge.className).toContain("text-status-warning");
    expect(screen.getByText("Simulated invoice send failure").className).toContain(
      "text-status-warning",
    );
    expect(screen.getByText("Simulated invoice send failure").className).toContain("break-words");
    expect(
      screen.queryByTestId(`automation-run-errors-privacy-${sampleRun.id}`),
    ).not.toBeInTheDocument();
  });

  it("redacts business names from run history errors and shows a privacy hint", () => {
    render(
      <AutomationHistoryPanel
        copy={copy}
        timezone={timezone}
        runs={[
          {
            ...sampleRun,
            id: "run-privacy-1",
            status: "PARTIAL",
            errors: [
              "Jewelry Store Alpha: Simulated invoice send failure",
              "owner@example.com: Monthly report failed",
            ],
          },
        ]}
        total={1}
        isLoading={false}
        isEmpty={false}
        isError={false}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByTestId("automation-run-errors-run-privacy-1")).toHaveTextContent(
      "Simulated invoice send failure",
    );
    expect(screen.getByTestId("automation-run-errors-run-privacy-1")).toHaveTextContent(
      "Monthly report failed",
    );
    expect(screen.queryByText("Jewelry Store Alpha")).not.toBeInTheDocument();
    expect(screen.queryByText("owner@example.com")).not.toBeInTheDocument();
    expect(screen.getByTestId("automation-run-errors-privacy-run-privacy-1")).toHaveTextContent(
      copy.history.errorsPrivacyHint,
    );
  });

  it("uses the default gold badge for successful runs without the running ring", () => {
    render(
      <AutomationHistoryPanel
        copy={copy}
        timezone={timezone}
        runs={[sampleRun]}
        total={1}
        isLoading={false}
        isEmpty={false}
        isError={false}
        onRetry={vi.fn()}
      />,
    );

    const badge = screen.getByTestId("automation-run-status-SUCCESS");
    expect(badge.className).toContain("text-brand-gold");
    expect(badge.className).not.toContain("ring-brand-gold/25");
    expect(badge.className).not.toContain("border-brand-gold/50");
  });

  it("formats run timestamps in the configured timezone", () => {
    const startedAt = "2026-06-01T10:00:00.000Z";

    render(
      <AutomationHistoryPanel
        copy={copy}
        timezone="America/New_York"
        runs={[{ ...sampleRun, startedAt }]}
        total={1}
        isLoading={false}
        isEmpty={false}
        isError={false}
        onRetry={vi.fn()}
      />,
    );

    expect(
      screen.getByText(formatDateTimeInTimezone(startedAt, "America/New_York")),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(formatDateTimeInTimezone(startedAt, "Asia/Kolkata")),
    ).not.toBeInTheDocument();
  });

  it("wraps long run error text readably inside the history list", () => {
    const longError =
      "SMTP connection failed while sending invoice reminder to billing@example.com with correlation-id=abcdefghijklmnopqrstuvwxyz0123456789";
    const runId = "run-long-error";

    render(
      <AutomationHistoryPanel
        copy={copy}
        timezone={timezone}
        runs={[
          {
            ...sampleRun,
            id: runId,
            status: "FAILED",
            errors: [
              longError,
              "Store Alpha: Payment reminder failed after SMTP timeout during automated billing cycle processing",
            ],
          },
        ]}
        total={1}
        isLoading={false}
        isEmpty={false}
        isError={false}
        onRetry={vi.fn()}
      />,
    );

    const errorList = screen.getByTestId(`automation-run-errors-${runId}`);
    expect(errorList.tagName).toBe("UL");
    expect(errorList.className).toContain("break-words");
    expect(errorList.className).toContain("min-w-0");

    const errorItems = screen.getAllByRole("listitem").filter((item) =>
      errorList.contains(item),
    );
    expect(errorItems).toHaveLength(2);
    for (const item of errorItems) {
      expect(item.className).toContain("min-w-0");
      expect(item.className).toContain("break-words");
    }
    expect(errorItems[0]).toHaveTextContent(longError);
    expect(errorItems[1]).toHaveTextContent(
      "Payment reminder failed after SMTP timeout during automated billing cycle processing",
    );
  });
});

describe("automationRunStatusBadgeVariant", () => {
  it("maps each automation run status to the expected badge variant", () => {
    expect(automationRunStatusBadgeVariant("RUNNING")).toBe("running");
    expect(automationRunStatusBadgeVariant("SUCCESS")).toBe("default");
    expect(automationRunStatusBadgeVariant("PARTIAL")).toBe("warning");
    expect(automationRunStatusBadgeVariant("FAILED")).toBe("error");
  });
});

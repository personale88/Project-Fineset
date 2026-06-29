import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import type { AutomationRunLogDto } from "@/lib/automation/types";
import {
  AUTOMATION_RUNS_QUERY_KEY,
  automationRunsQueryKey,
  flattenAutomationRunPages,
  getAutomationRunHistoryNextPageParam,
  prependAutomationRunToCache,
  seedAutomationRunHistoryCache,
} from "@/lib/automation/runs-query";

function makeRun(id: string): AutomationRunLogDto {
  return {
    id,
    trigger: "MANUAL",
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
    triggeredByEmail: "admin@test.local",
  };
}

describe("getAutomationRunHistoryNextPageParam", () => {
  it("returns the next page while more runs remain", () => {
    const pageOneRuns = Array.from({ length: 20 }, (_, index) => makeRun(`run-${index + 1}`));

    expect(
      getAutomationRunHistoryNextPageParam(
        { runs: pageOneRuns, total: 25 },
        [{ runs: pageOneRuns, total: 25 }],
      ),
    ).toBe(2);
  });

  it("returns undefined when all runs are loaded", () => {
    const pageOneRuns = Array.from({ length: 20 }, (_, index) => makeRun(`run-${index + 1}`));
    const pageTwoRuns = Array.from({ length: 5 }, (_, index) => makeRun(`run-${index + 21}`));

    expect(
      getAutomationRunHistoryNextPageParam(
        { runs: pageTwoRuns, total: 25 },
        [
          { runs: pageOneRuns, total: 25 },
          { runs: pageTwoRuns, total: 25 },
        ],
      ),
    ).toBeUndefined();
  });
});

describe("flattenAutomationRunPages", () => {
  it("concatenates runs from all loaded pages", () => {
    const runA = makeRun("run-a");
    const runB = makeRun("run-b");

    expect(
      flattenAutomationRunPages([
        { runs: [runA], total: 2 },
        { runs: [runB], total: 2 },
      ]),
    ).toEqual([runA, runB]);
  });
});

describe("seedAutomationRunHistoryCache", () => {
  it("seeds infinite and first-page caches", () => {
    const queryClient = new QueryClient();
    const run = makeRun("run-1");

    seedAutomationRunHistoryCache(queryClient, [{ runs: [run], total: 1 }]);

    expect(queryClient.getQueryData(AUTOMATION_RUNS_QUERY_KEY)).toEqual({
      pages: [{ runs: [run], total: 1 }],
      pageParams: [1],
    });
    expect(queryClient.getQueryData(automationRunsQueryKey(1))).toEqual({
      runs: [run],
      total: 1,
    });
  });
});

describe("prependAutomationRunToCache", () => {
  it("prepends a new run to the infinite history cache and first page cache", () => {
    const queryClient = new QueryClient();
    const existing = makeRun("run-existing");

    seedAutomationRunHistoryCache(queryClient, [{ runs: [existing], total: 1 }]);

    const created = makeRun("run-new");
    prependAutomationRunToCache(queryClient, created);

    expect(queryClient.getQueryData(AUTOMATION_RUNS_QUERY_KEY)).toEqual({
      pages: [{ runs: [created, existing], total: 2 }],
      pageParams: [1],
    });
    expect(queryClient.getQueryData(automationRunsQueryKey(1))).toEqual({
      runs: [created, existing],
      total: 2,
    });
  });

  it("does not duplicate a run already present in cache", () => {
    const queryClient = new QueryClient();
    const existing = makeRun("run-existing");

    seedAutomationRunHistoryCache(queryClient, [{ runs: [existing], total: 1 }]);

    prependAutomationRunToCache(queryClient, existing);

    expect(queryClient.getQueryData(AUTOMATION_RUNS_QUERY_KEY)).toEqual({
      pages: [{ runs: [existing], total: 1 }],
      pageParams: [1],
    });
    expect(queryClient.getQueryData(automationRunsQueryKey(1))).toEqual({
      runs: [existing],
      total: 1,
    });
  });
});

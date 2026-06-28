/** Centralized latency budgets (ms) for performance regression tests. */
export const PERF_BUDGETS = {
  api: {
    visits: 5_000,
    calls: 5_000,
    fieldSales: 5_000,
    staff: 4_000,
    storeOverview: 8_000,
    storePortfolio: 5_000,
    storeAnalytics: 6_000,
    myStores: 2_000,
    adminAnalytics: 5_000,
    staffPerformance: 4_000,
    staffCalls: 3_000,
    regionCheck: 1_000,
  },
  e2e: {
    loginShell: 3_000,
    storeDashboard: 4_000,
    storeDetail: 5_000,
    adminDashboard: 5_000,
    staffCallsPage: 4_000,
  },
  pwa: {
    coldLoadLogin: 3_000,
    standaloneNonBlank: 3_000,
    standaloneShell: 5_000,
    swReady: 8_000,
    warmLaunch: 2_000,
    offlinePage: 2_000,
    manifestFetch: 500,
    swFetch: 1_000,
  },
  cpu: {
    portalCallFilter10k: 100,
    normalizePortfolio100: 50,
    visitExport1k: 2_000,
  },
  automation: {
    run120BusinessesDryRun: 30_000,
  },
  payload: {
    visitsPageMaxBytes: 500_000,
  },
} as const;

/** Fail if elapsed exceeds budget; allows 20% regression vs stored baseline when set. */
export function assertWithinBudget(
  elapsedMs: number,
  budgetMs: number,
  baselineMs?: number,
): void {
  const limit =
    baselineMs !== undefined
      ? Math.max(budgetMs, Math.ceil(baselineMs * 1.2))
      : budgetMs;
  if (elapsedMs > limit) {
    throw new Error(
      `Expected <= ${limit}ms (budget ${budgetMs}ms${baselineMs !== undefined ? `, baseline ${baselineMs}ms` : ""}), got ${elapsedMs}ms`,
    );
  }
}

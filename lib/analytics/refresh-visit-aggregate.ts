import { invalidateSummaryCache } from "@/lib/cache/analytics-cache";
import { prisma } from "@/lib/db/prisma";

let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let refreshInFlight: Promise<void> | null = null;

const DEBOUNCE_MS = 3_000;

/**
 * Rebuilds visit_daily_aggregate from the live Visit table.
 * Safe to call concurrently — coalesces in-flight refreshes.
 */
export async function refreshVisitAggregate(): Promise<void> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    try {
      await prisma.$executeRawUnsafe("SELECT refresh_visit_aggregate()");
      await invalidateSummaryCache();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("refresh_visit_aggregate") || message.includes("visit_daily_aggregate")) {
        console.warn("[refresh-visit-aggregate] skipped — materialized view not available:", message);
        return;
      }
      console.error("[refresh-visit-aggregate] failed", error);
      throw error;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

/** Debounced refresh for single visit writes (avoids hammering DB during bulk import). */
export function scheduleVisitAggregateRefresh(): void {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
  }
  refreshTimer = setTimeout(() => {
    refreshTimer = null;
    void refreshVisitAggregate().catch(() => undefined);
  }, DEBOUNCE_MS);
}

export function notifyVisitsChanged(options?: { immediate?: boolean }): void {
  if (options?.immediate) {
    void refreshVisitAggregate().catch(() => undefined);
    return;
  }
  scheduleVisitAggregateRefresh();
}

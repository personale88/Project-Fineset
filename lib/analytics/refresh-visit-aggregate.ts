import { prisma } from "@/lib/db/prisma";
import { captureServerError } from "@/lib/monitoring/capture-error";

let refreshInFlight: Promise<void> | null = null;

/** Refreshes visit_daily_aggregate after visit mutations (best-effort). */
export async function refreshVisitDailyAggregate(): Promise<void> {
  if (refreshInFlight) {
    await refreshInFlight;
    return;
  }

  refreshInFlight = (async () => {
    try {
      await prisma.$executeRawUnsafe("SELECT refresh_visit_aggregate()");
    } catch (error) {
      captureServerError(error, { tags: { area: "analytics", action: "refresh_visit_aggregate" } });
    }
  })();

  try {
    await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

export function scheduleVisitDailyAggregateRefresh(): void {
  void refreshVisitDailyAggregate();
}

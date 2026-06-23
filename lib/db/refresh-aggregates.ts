import { prisma } from "@/lib/db/prisma";

/**
 * Triggers a non-blocking CONCURRENTLY refresh of the visit_daily_aggregate
 * materialized view. Call this fire-and-forget after any visit write so
 * analytics queries stay up-to-date without blocking the write path.
 *
 * Safe to call concurrently — PostgreSQL serialises CONCURRENTLY refreshes.
 */
export function scheduleAggregateRefresh(): void {
  void prisma
    .$executeRaw`SELECT refresh_visit_aggregate()`
    .catch((err: unknown) => {
      // Non-fatal: view will be refreshed by the next write or nightly job.
      console.warn("[refresh-aggregates] background refresh failed", err);
    });
}

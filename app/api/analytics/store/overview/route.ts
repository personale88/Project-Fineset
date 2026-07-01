import { NextResponse } from "next/server";
import { withAuthQuery } from "@/lib/api/route-handler";
import { resolveAnalyticsStoreId } from "@/lib/auth/resolve-manager-store-id";
import { createPerfTimer, logPerf } from "@/lib/perf/timing";
import {
  getAdminStoreOverviewBundle,
  getStoreOverviewBundle,
} from "@/lib/services/store-overview-bundle";
import { getAnalyticsQuerySchema } from "@/lib/validations/analytics.schema";

export const GET = withAuthQuery(
  ["STORE_MANAGER", "BUSINESS_OWNER", "MASTER_ADMIN"] as const,
  getAnalyticsQuerySchema,
  async (session, query) => {
    const timer = createPerfTimer();
    timer.mark("auth");

    const storeId = await resolveAnalyticsStoreId(session, query.storeId);
    if (storeId instanceof NextResponse) return storeId;
    timer.mark("resolveStore");

    const bundle =
      session.role === "MASTER_ADMIN"
        ? await getAdminStoreOverviewBundle(storeId, query.period)
        : await getStoreOverviewBundle(session, storeId, query.period);
    timer.mark("bundle");

    logPerf("/api/analytics/store/overview", timer.finish());

    return NextResponse.json({
      period: query.period,
      storeId,
      ...bundle,
    });
  },
);

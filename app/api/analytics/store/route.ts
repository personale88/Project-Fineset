import { NextResponse } from "next/server";
import { withAuthQuery } from "@/lib/api/route-handler";
import { resolveAnalyticsStoreId } from "@/lib/auth/resolve-manager-store-id";
import { createPerfTimer, logPerf } from "@/lib/perf/timing";
import { getStoreAnalytics } from "@/lib/services/analytics";
import { getAnalyticsQuerySchema } from "@/lib/validations/analytics.schema";

export const GET = withAuthQuery(
  ["STORE_MANAGER", "BUSINESS_OWNER", "MASTER_ADMIN"] as const,
  getAnalyticsQuerySchema,
  async (session, query) => {
    const timer = createPerfTimer();

    const storeId = await resolveAnalyticsStoreId(
      session,
      query.storeId,
    );
    if (storeId instanceof NextResponse) return storeId;

    const data = await getStoreAnalytics(storeId, query.period);
    logPerf("/api/analytics/store", timer.finish());

    return NextResponse.json(data);
  },
);

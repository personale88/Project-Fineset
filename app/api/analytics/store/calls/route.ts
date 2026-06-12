import { NextResponse } from "next/server";
import {
  badRequest,
  getServerSession,
  requireRole,
  unauthorized,
} from "@/lib/auth/session";
import { handleRouteError } from "@/lib/api/route-handler";
import { resolveAnalyticsStoreId } from "@/lib/auth/resolve-manager-store-id";
import { getStoreCallAnalytics } from "@/lib/services/store-call-analytics";
import { getAnalyticsQuerySchema } from "@/lib/validations/analytics.schema";

export async function GET(req: Request) {
  const startedAt = Date.now();
  try {
    const session = await getServerSession();
    if (!requireRole(session, ["STORE_MANAGER", "BUSINESS_OWNER", "MASTER_ADMIN"])) {
      return unauthorized();
    }

    const { searchParams } = new URL(req.url);
    const query = getAnalyticsQuerySchema.safeParse(
      Object.fromEntries(searchParams.entries()),
    );
    if (!query.success) return badRequest(query.error.flatten());

    const storeId = await resolveAnalyticsStoreId(
      session,
      query.data.storeId,
    );
    if (storeId instanceof NextResponse) return storeId;

    const data = await getStoreCallAnalytics(storeId, query.data.period);
    return NextResponse.json(data);
  } catch (error) {
    console.error("[api.analytics.store.calls] failed", {
      elapsedMs: Date.now() - startedAt,
      error,
    });
    return handleRouteError(error);
  }
}

import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-handler";
import {
  getServerSession,
  requireRole,
  unauthorized,
} from "@/lib/auth/session";
import { resolvePortalStoreIdForSession } from "@/lib/auth/resolve-manager-store-id";
import { listAccessibleStores } from "@/lib/services/manager-stores";
import {
  listPortfolioWorkQueue,
  listStoreWorkQueue,
} from "@/lib/services/staff-work-queue";
import { parsePeriodParam } from "@/lib/utils/analytics-period-url";

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!requireRole(session, ["BUSINESS_OWNER", "STORE_MANAGER"])) {
      return unauthorized();
    }

    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") ?? "15");
    const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 100) : 30;
    const requestedStoreId = searchParams.get("storeId");
    const periodParam = searchParams.get("period");
    const period = periodParam ? parsePeriodParam(periodParam) : undefined;

    if (session.role === "STORE_MANAGER") {
      const storeId = session.storeId;
      const stores = await listAccessibleStores(session);
      const storeName = stores.find((store) => store.id === storeId)?.name ?? session.storeName;
      const result = await listStoreWorkQueue({
        storeId,
        storeName: storeName ?? "Store",
        limit: safeLimit,
        period,
      });
      return NextResponse.json(result);
    }

    if (requestedStoreId) {
      const storeId = await resolvePortalStoreIdForSession(session, requestedStoreId);
      if (storeId instanceof NextResponse) return storeId;

      const stores = await listAccessibleStores(session);
      const storeName = stores.find((store) => store.id === storeId)?.name ?? null;
      const result = await listStoreWorkQueue({
        storeId,
        storeName: storeName ?? "Store",
        limit: safeLimit,
        period,
      });
      return NextResponse.json(result);
    }

    const stores = await listAccessibleStores(session);
    const result = await listPortfolioWorkQueue({
      stores: stores.map((store) => ({ id: store.id, name: store.name })),
      limit: safeLimit,
      period,
    });
    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}

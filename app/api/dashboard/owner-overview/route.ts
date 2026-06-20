import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-handler";
import {
  getServerSession,
  requireRole,
  unauthorized,
} from "@/lib/auth/session";
import { listAccessibleStores } from "@/lib/services/manager-stores";
import { getOwnerDashboardOverview } from "@/lib/services/owner-dashboard";
import { parsePeriodParam } from "@/lib/utils/analytics-period-url";

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!requireRole(session, ["BUSINESS_OWNER"])) {
      return unauthorized();
    }

    const { searchParams } = new URL(req.url);
    const period = parsePeriodParam(searchParams.get("period"));

    const stores = await listAccessibleStores(session);
    const storeIds = stores.map((store) => store.id);
    const data = await getOwnerDashboardOverview(storeIds, period);
    return NextResponse.json(data);
  } catch (error) {
    return handleRouteError(error);
  }
}

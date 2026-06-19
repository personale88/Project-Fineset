import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-handler";
import { resolvePortalStoreIdForSession } from "@/lib/auth/resolve-manager-store-id";
import {
  getServerSession,
  requireRole,
  unauthorized,
} from "@/lib/auth/session";
import { getManagerDashboardOverview } from "@/lib/services/manager-dashboard";

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!requireRole(session, ["STORE_MANAGER", "BUSINESS_OWNER", "MASTER_ADMIN"])) {
      return unauthorized();
    }

    const storeId = await resolvePortalStoreIdForSession(
      session,
      new URL(req.url).searchParams.get("storeId"),
    );
    if (storeId instanceof NextResponse) return storeId;

    const data = await getManagerDashboardOverview(storeId);
    return NextResponse.json(data);
  } catch (error) {
    return handleRouteError(error);
  }
}

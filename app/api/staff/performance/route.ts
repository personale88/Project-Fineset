import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-handler";
import { getStaffPerformance } from "@/lib/services/staff";
import { resolveStorePortalStoreId } from "@/lib/auth/resolve-manager-store-id";
import {
  getServerSession,
  requireRole,
  unauthorized,
} from "@/lib/auth/session";

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!requireRole(session, ["BUSINESS_OWNER", "MASTER_ADMIN", "STORE_MANAGER"])) {
      return unauthorized();
    }

    const { searchParams } = new URL(req.url);
    let storeId: string | undefined;

    if (session.role === "BUSINESS_OWNER" || session.role === "STORE_MANAGER") {
      const resolved = await resolveStorePortalStoreId(
        session,
        searchParams.get("storeId") ?? undefined,
      );
      if (resolved instanceof NextResponse) return resolved;
      storeId = resolved;
    } else {
      storeId = searchParams.get("storeId") ?? undefined;
    }

    const data = await getStaffPerformance(storeId);
    return NextResponse.json(data);
  } catch (error) {
    return handleRouteError(error);
  }
}

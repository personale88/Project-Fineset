import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-handler";
import {
  getServerSession,
  requireRole,
  unauthorized,
} from "@/lib/auth/session";
import { resolvePortalStoreIdForSession } from "@/lib/auth/resolve-manager-store-id";
import { listStoreActivity } from "@/lib/services/store-activity";

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!requireRole(session, ["STORE_MANAGER", "BUSINESS_OWNER"])) {
      return unauthorized();
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit") ?? 50), 100);

    let storeId: string;
    if (session.role === "STORE_MANAGER") {
      storeId = session.storeId;
    } else {
      const resolved = await resolvePortalStoreIdForSession(
        session,
        searchParams.get("storeId"),
      );
      if (resolved instanceof NextResponse) return resolved;
      storeId = resolved;
    }

    const data = await listStoreActivity(storeId, limit);
    return NextResponse.json(data);
  } catch (error) {
    return handleRouteError(error);
  }
}

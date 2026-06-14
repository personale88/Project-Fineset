import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-handler";
import { resolvePortalStoreIdForSession } from "@/lib/auth/resolve-manager-store-id";
import {
  forbidden,
  getServerSession,
  notFound,
  requireRole,
  unauthorized,
} from "@/lib/auth/session";
import { requireStaffContext } from "@/lib/auth/resolve-staff";
import { getVisitById } from "@/lib/services/visits";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getServerSession();
    if (!requireRole(session, ["STORE_MANAGER", "BUSINESS_OWNER", "MASTER_ADMIN", "STAFF"])) {
      return unauthorized();
    }

    const { searchParams } = new URL(req.url);
    let storeId: string | undefined;

    if (session.role === "MASTER_ADMIN") {
      storeId = searchParams.get("storeId") ?? undefined;
    } else if (session.role === "STAFF") {
      const staff = await requireStaffContext(session);
      if (!staff) return unauthorized();
      storeId = staff.storeId;
    } else {
      const resolved = await resolvePortalStoreIdForSession(
        session,
        searchParams.get("storeId"),
      );
      if (resolved instanceof NextResponse) return resolved;
      storeId = resolved;
    }

    const visit = await getVisitById(id, storeId);
    if (!visit) return notFound();

    if (session.role === "STAFF") {
      const staff = await requireStaffContext(session);
      if (!staff || visit.staffId !== staff.staffId) {
        return forbidden();
      }
    }

    return NextResponse.json(visit);
  } catch (error) {
    return handleRouteError(error);
  }
}

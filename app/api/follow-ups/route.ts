import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-handler";
import { resolvePortalStoreIdForSession } from "@/lib/auth/resolve-manager-store-id";
import {
  badRequest,
  getServerSession,
  requireRole,
  unauthorized,
} from "@/lib/auth/session";
import { requireStaffContext } from "@/lib/auth/resolve-staff";
import { listFollowUps } from "@/lib/services/follow-ups";
import { followUpQuerySchema } from "@/lib/validations/follow-ups.schema";

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!requireRole(session, ["STORE_MANAGER", "BUSINESS_OWNER", "STAFF"])) {
      return unauthorized();
    }

    const { searchParams } = new URL(req.url);
    const query = followUpQuerySchema.safeParse(
      Object.fromEntries(searchParams.entries()),
    );
    if (!query.success) return badRequest(query.error.flatten());

    let storeId: string;
    let staffId: string | undefined;

    if (session.role === "STAFF") {
      const staff = await requireStaffContext(session);
      if (!staff) return unauthorized();
      storeId = staff.storeId;
      staffId = staff.staffId;
    } else {
      const resolved = await resolvePortalStoreIdForSession(
        session,
        searchParams.get("storeId"),
      );
      if (resolved instanceof NextResponse) return resolved;
      storeId = resolved;
    }

    const data = await listFollowUps({
      storeId,
      staffId,
      status: query.data.status,
      overdue: query.data.overdue,
    });

    return NextResponse.json(data);
  } catch (error) {
    return handleRouteError(error);
  }
}

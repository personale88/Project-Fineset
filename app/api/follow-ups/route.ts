import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-handler";
import { isPortalDataReadBlocked } from "@/lib/auth/billing-access-guard";
import { resolvePortalStoreIdForSession } from "@/lib/auth/resolve-manager-store-id";
import {
  badRequest,
  getServerSession,
  requireRole,
  unauthorized,
} from "@/lib/auth/session";
import { requireStaffContext } from "@/lib/auth/resolve-staff";
import { resolvePersonalStaffId, isUnlinkedManagerPersonalScope } from "@/lib/auth/resolve-personal-scope";
import { listFollowUps } from "@/lib/services/follow-ups";
import { followUpQuerySchema } from "@/lib/validations/follow-ups.schema";
import { prisma } from "@/lib/db/prisma";

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
      const personalStaffId = await resolvePersonalStaffId(session, query.data.personalScope);
      if (isUnlinkedManagerPersonalScope(session, query.data.personalScope, personalStaffId)) {
        return NextResponse.json([]);
      }
      if (query.data.viewStaffId) {
        const member = await prisma.staff.findFirst({
          where: { id: query.data.viewStaffId, storeId, isActive: true },
          select: { id: true },
        });
        if (!member) return badRequest("Invalid staff filter");
        staffId = query.data.viewStaffId;
      } else if (personalStaffId) {
        staffId = personalStaffId;
      }
    }

    const blocked = await isPortalDataReadBlocked(session, storeId);
    if (blocked) {
      return NextResponse.json([]);
    }

    const data = await listFollowUps({
      storeId,
      staffId,
      status: query.data.status,
      overdue: query.data.overdue,
      dueToday: query.data.dueToday,
      filter: query.data.filter,
      mismatched: query.data.mismatched,
    });

    return NextResponse.json(data);
  } catch (error) {
    return handleRouteError(error);
  }
}

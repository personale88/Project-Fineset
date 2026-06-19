import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-handler";
import { getServerSession, requireRole, unauthorized } from "@/lib/auth/session";
import { requireStaffContext } from "@/lib/auth/resolve-staff";
import { getStaffWorkQueueDigest } from "@/lib/services/staff-work-queue";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!requireRole(session, ["STAFF"])) return unauthorized();

    const staff = await requireStaffContext(session);
    if (!staff) return unauthorized();

    const digest = await getStaffWorkQueueDigest({
      staffId: staff.staffId,
      storeId: staff.storeId,
    });

    return NextResponse.json(digest);
  } catch (error) {
    return handleRouteError(error);
  }
}

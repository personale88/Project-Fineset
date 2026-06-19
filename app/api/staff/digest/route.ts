import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-handler";
import { getServerSession, requireRole, unauthorized } from "@/lib/auth/session";
import { requirePortalActorContext } from "@/lib/auth/resolve-staff";
import { getStaffWorkQueueDigest } from "@/lib/services/staff-work-queue";

const DIGEST_ROLES = ["STAFF", "STORE_MANAGER"] as const;

export async function GET() {
  try {
    const session = await getServerSession();
    if (!requireRole(session, DIGEST_ROLES)) return unauthorized();

    const staff = await requirePortalActorContext(session);
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

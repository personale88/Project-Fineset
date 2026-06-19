import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-handler";
import { getServerSession, requireRole, unauthorized } from "@/lib/auth/session";
import { requirePortalActorContext } from "@/lib/auth/resolve-staff";
import { listStaffWorkQueue } from "@/lib/services/staff-work-queue";

const WORK_QUEUE_ROLES = ["STAFF", "STORE_MANAGER"] as const;

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!requireRole(session, WORK_QUEUE_ROLES)) return unauthorized();

    const staff = await requirePortalActorContext(session);
    if (!staff) return unauthorized();

    const limit = Number(new URL(req.url).searchParams.get("limit") ?? "15");

    const result = await listStaffWorkQueue({
      staffId: staff.staffId,
      storeId: staff.storeId,
      limit: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 30) : 15,
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}

import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-handler";
import { getServerSession, requireRole, unauthorized } from "@/lib/auth/session";
import { requirePortalActorContext } from "@/lib/auth/resolve-staff";
import { listStaffWorkQueue } from "@/lib/services/staff-work-queue";
import { parsePeriodParam } from "@/lib/utils/analytics-period-url";

const WORK_QUEUE_ROLES = ["STAFF", "STORE_MANAGER"] as const;

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!requireRole(session, WORK_QUEUE_ROLES)) return unauthorized();

    const staff = await requirePortalActorContext(session);
    if (!staff) return unauthorized();

    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") ?? "15");
    const periodParam = searchParams.get("period");
    const period = periodParam ? parsePeriodParam(periodParam) : undefined;

    const result = await listStaffWorkQueue({
      staffId: staff.staffId,
      storeId: staff.storeId,
      limit: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 30) : 15,
      period,
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}

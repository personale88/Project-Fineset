import { NextResponse } from "next/server";
import {
  badRequest,
  getServerSession,
  requireRole,
  unauthorized,
} from "@/lib/auth/session";
import { handleRouteError } from "@/lib/api/route-handler";
import {
  STAFF_CALLS_ROLES,
  requireStaffCallsContext,
} from "@/lib/auth/resolve-staff";
import { listStaffCalls } from "@/lib/services/staff-calls";
import { staffCallListQuerySchema, staffCallMasterFilterSchema } from "@/lib/validations/staff-calls.schema";

export async function GET(req: Request) {
  const startedAt = Date.now();
  try {
    const session = await getServerSession();
    if (!requireRole(session, STAFF_CALLS_ROLES)) return unauthorized();

    const { searchParams } = new URL(req.url);
    const query = staffCallListQuerySchema.safeParse(
      Object.fromEntries(searchParams.entries()),
    );
    if (!query.success) return badRequest(query.error.flatten());

    const staff = await requireStaffCallsContext(session, query.data.storeId);
    if (!staff) return unauthorized();

    const result = await listStaffCalls({
      staffId: staff.staffId,
      storeId: staff.storeId,
      master: query.data.master,
      segment: query.data.segment,
      valueTier: query.data.valueTier,
      queue: query.data.queue,
      birthday: query.data.birthday,
      anniversary: query.data.anniversary,
      year: query.data.year,
      month: query.data.month,
      page: query.data.page,
      pageSize: query.data.pageSize,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[api.staff.calls] failed", {
      elapsedMs: Date.now() - startedAt,
      error,
    });
    return handleRouteError(error);
  }
}

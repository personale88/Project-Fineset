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
import { listStaffCallFilters } from "@/lib/services/staff-calls";
import { staffCallListQuerySchema } from "@/lib/validations/staff-calls.schema";

export async function GET(req: Request) {
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

    const filters = await listStaffCallFilters({
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
    });

    return NextResponse.json(filters);
  } catch (error) {
    return handleRouteError(error);
  }
}

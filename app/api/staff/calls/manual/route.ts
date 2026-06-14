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
import { recordManualStaffCall, ManualStaffCallError } from "@/lib/services/staff-calls";
import { manualStaffCallSchema } from "@/lib/validations/staff-calls.schema";

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!requireRole(session, STAFF_CALLS_ROLES)) return unauthorized();

    const storeId = new URL(req.url).searchParams.get("storeId") ?? undefined;
    const staff = await requireStaffCallsContext(session, storeId);
    if (!staff) return unauthorized();

    const body: unknown = await req.json();
    const parsed = manualStaffCallSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.flatten());

    const result = await recordManualStaffCall({
      ...parsed.data,
      staffId: staff.staffId,
      storeId: staff.storeId,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ManualStaffCallError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return handleRouteError(error);
  }
}

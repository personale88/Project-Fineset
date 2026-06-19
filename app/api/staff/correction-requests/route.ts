import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-handler";
import {
  badRequest,
  getServerSession,
  requireRole,
  unauthorized,
} from "@/lib/auth/session";
import { requireStaffContext } from "@/lib/auth/resolve-staff";
import {
  CorrectionRequestError,
  createCorrectionRequest,
} from "@/lib/services/correction-requests";
import { staffCorrectionRequestSchema } from "@/lib/validations/staff-amend.schema";

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!requireRole(session, ["STAFF"])) return unauthorized();

    const staff = await requireStaffContext(session);
    if (!staff) return unauthorized();

    const body: unknown = await req.json();
    const parsed = staffCorrectionRequestSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.flatten());

    const request = await createCorrectionRequest({
      staffId: staff.staffId,
      storeId: staff.storeId,
      authId: session.userId,
      data: parsed.data,
    });

    return NextResponse.json(request, { status: 201 });
  } catch (error) {
    if (error instanceof CorrectionRequestError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return handleRouteError(error);
  }
}

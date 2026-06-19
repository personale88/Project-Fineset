import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { handleRouteError } from "@/lib/api/route-handler";
import { resolvePortalStoreIdForSession } from "@/lib/auth/resolve-manager-store-id";
import {
  badRequest,
  forbidden,
  getServerSession,
  notFound,
  requireRole,
  unauthorized,
} from "@/lib/auth/session";
import { requireStaffContext } from "@/lib/auth/resolve-staff";
import { StaffAmendError, amendStaffVisit } from "@/lib/services/staff-amend";
import { staffAmendVisitSchema } from "@/lib/validations/staff-amend.schema";
import { getVisitById } from "@/lib/services/visits";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getServerSession();
    if (!requireRole(session, ["STORE_MANAGER", "BUSINESS_OWNER", "MASTER_ADMIN", "STAFF"])) {
      return unauthorized();
    }

    const { searchParams } = new URL(req.url);
    let storeId: string | undefined;

    if (session.role === "MASTER_ADMIN") {
      storeId = searchParams.get("storeId") ?? undefined;
    } else if (session.role === "STAFF") {
      const staff = await requireStaffContext(session);
      if (!staff) return unauthorized();
      storeId = staff.storeId;
    } else {
      const resolved = await resolvePortalStoreIdForSession(
        session,
        searchParams.get("storeId"),
      );
      if (resolved instanceof NextResponse) return resolved;
      storeId = resolved;
    }

    const visit = await getVisitById(id, storeId);
    if (!visit) return notFound();

    if (session.role === "STAFF") {
      const staff = await requireStaffContext(session);
      if (!staff || visit.staffId !== staff.staffId) {
        return forbidden();
      }
    }

    return NextResponse.json(visit);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getServerSession();
    if (!requireRole(session, ["STAFF"])) return unauthorized();

    const staff = await requireStaffContext(session);
    if (!staff) return unauthorized();

    const body: unknown = await req.json();
    const parsed = staffAmendVisitSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.flatten());

    await amendStaffVisit({
      visitId: id,
      staffId: staff.staffId,
      storeId: staff.storeId,
      authId: session.userId,
      data: parsed.data,
    });

    revalidateTag(`store:${staff.storeId}`, { expire: 0 });

    const visit = await getVisitById(id, staff.storeId);
    return NextResponse.json(visit);
  } catch (error) {
    if (error instanceof StaffAmendError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return handleRouteError(error);
  }
}

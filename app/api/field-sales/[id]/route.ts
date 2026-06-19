import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { handleRouteError } from "@/lib/api/route-handler";
import {
  badRequest,
  forbidden,
  getServerSession,
  notFound,
  requireRole,
  unauthorized,
} from "@/lib/auth/session";
import { requireStaffContext } from "@/lib/auth/resolve-staff";
import { resolvePortalStoreIdForSession } from "@/lib/auth/resolve-manager-store-id";
import { StaffAmendError, amendStaffFieldSale } from "@/lib/services/staff-amend";
import { staffAmendFieldSaleSchema } from "@/lib/validations/staff-amend.schema";
import { getFieldSaleById } from "@/lib/services/field-sales-detail";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getServerSession();
    if (!requireRole(session, ["STAFF", "STORE_MANAGER", "BUSINESS_OWNER", "MASTER_ADMIN"])) {
      return unauthorized();
    }

    const { searchParams } = new URL(req.url);
    let storeId: string | undefined;

    if (session.role === "STAFF") {
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

    const fieldSale = await getFieldSaleById(id, storeId);
    if (!fieldSale) return notFound();

    if (session.role === "STAFF") {
      const staff = await requireStaffContext(session);
      if (!staff || fieldSale.staffId !== staff.staffId) return forbidden();
    }

    return NextResponse.json(fieldSale);
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
    const parsed = staffAmendFieldSaleSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.flatten());

    await amendStaffFieldSale({
      fieldSaleId: id,
      staffId: staff.staffId,
      storeId: staff.storeId,
      authId: session.userId,
      data: parsed.data,
    });

    revalidateTag(`store:${staff.storeId}`, { expire: 0 });

    const fieldSale = await getFieldSaleById(id, staff.storeId);
    return NextResponse.json(fieldSale);
  } catch (error) {
    if (error instanceof StaffAmendError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return handleRouteError(error);
  }
}

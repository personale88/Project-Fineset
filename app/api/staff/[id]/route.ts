import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-handler";
import { resolveStorePortalStoreId } from "@/lib/auth/resolve-manager-store-id";
import {
  badRequest,
  getServerSession,
  notFound,
  requireRole,
  unauthorized,
} from "@/lib/auth/session";
import {
  deleteStaff,
  StaffDeleteError,
  StaffUpdateError,
  updateStaff,
} from "@/lib/services/staff";
import { updateStaffSchema } from "@/lib/validations/staff.schema";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const { id } = await params;
  try {
    const session = await getServerSession();
    if (!requireRole(session, ["BUSINESS_OWNER"])) return unauthorized();

    const { searchParams } = new URL(req.url);
    const resolved = await resolveStorePortalStoreId(
      session,
      searchParams.get("storeId") ?? undefined,
    );
    if (resolved instanceof NextResponse) return resolved;

    const body: unknown = await req.json();
    const parsed = updateStaffSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.flatten());

    const result = await updateStaff(id, resolved, parsed.data);
    if (result.count === 0) return notFound("Staff member not found");

    return NextResponse.json({ count: result.count });
  } catch (error) {
    if (error instanceof StaffUpdateError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return handleRouteError(error);
  }
}

export async function DELETE(req: Request, { params }: RouteParams) {
  const { id } = await params;
  try {
    const session = await getServerSession();
    if (!requireRole(session, ["BUSINESS_OWNER"])) return unauthorized();

    const { searchParams } = new URL(req.url);
    const resolved = await resolveStorePortalStoreId(
      session,
      searchParams.get("storeId") ?? undefined,
    );
    if (resolved instanceof NextResponse) return resolved;

    await deleteStaff(id, resolved);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof StaffDeleteError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return handleRouteError(error);
  }
}

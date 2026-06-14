import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-handler";
import { resolvePortalStoreIdForSession } from "@/lib/auth/resolve-manager-store-id";
import {
  badRequest,
  getServerSession,
  notFound,
  requireRole,
  unauthorized,
} from "@/lib/auth/session";
import { requireStaffContext } from "@/lib/auth/resolve-staff";
import { updateFollowUpStatus } from "@/lib/services/follow-ups";
import { updateFollowUpSchema } from "@/lib/validations/follow-ups.schema";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getServerSession();
    if (!requireRole(session, ["STORE_MANAGER", "BUSINESS_OWNER", "STAFF"])) {
      return unauthorized();
    }

    const body: unknown = await req.json();
    const parsed = updateFollowUpSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.flatten());
    if (!parsed.data.status) {
      return badRequest({ status: ["status is required"] });
    }

    let storeId: string;
    let staffId: string | undefined;

    if (session.role === "STAFF") {
      const staff = await requireStaffContext(session);
      if (!staff) return unauthorized();
      storeId = staff.storeId;
      staffId = staff.staffId;
    } else {
      const { searchParams } = new URL(req.url);
      const resolved = await resolvePortalStoreIdForSession(
        session,
        searchParams.get("storeId"),
      );
      if (resolved instanceof NextResponse) return resolved;
      storeId = resolved;
    }

    const updated = await updateFollowUpStatus(
      id,
      storeId,
      parsed.data.status,
      staffId,
    );
    if (!updated) return notFound("Follow-up not found");

    return NextResponse.json(updated);
  } catch (error) {
    return handleRouteError(error);
  }
}

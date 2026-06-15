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
import {
  assignCustomerToStaff,
  CustomerAssignmentError,
} from "@/lib/services/customer-assignment";
import { assignCustomerSchema } from "@/lib/validations/customer-assignment.schema";

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!requireRole(session, ["STORE_MANAGER", "BUSINESS_OWNER", "MASTER_ADMIN"])) {
      return unauthorized();
    }

    const body: unknown = await req.json();
    const parsed = assignCustomerSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.flatten());

    const { searchParams } = new URL(req.url);
    const resolved = await resolvePortalStoreIdForSession(
      session,
      searchParams.get("storeId"),
    );
    if (resolved instanceof NextResponse) return resolved;

    const result = await assignCustomerToStaff({
      storeId: resolved,
      targetStaffId: parsed.data.targetStaffId,
      visitId: parsed.data.visitId,
      fieldSaleId: parsed.data.fieldSaleId,
      followUpId: parsed.data.followUpId,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof CustomerAssignmentError) {
      if (error.code === "NOT_FOUND") {
        return notFound(error.message);
      }
      return badRequest({ _errors: [error.message] }, error.message);
    }
    return handleRouteError(error);
  }
}

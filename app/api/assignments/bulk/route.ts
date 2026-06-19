import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-handler";
import { resolvePortalStoreIdForSession } from "@/lib/auth/resolve-manager-store-id";
import {
  badRequest,
  getServerSession,
  requireRole,
  unauthorized,
} from "@/lib/auth/session";
import {
  bulkAssignFollowUps,
  CustomerAssignmentError,
} from "@/lib/services/customer-assignment";
import { bulkAssignFollowUpsSchema } from "@/lib/validations/bulk-assignment.schema";

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!requireRole(session, ["STORE_MANAGER", "BUSINESS_OWNER", "MASTER_ADMIN"])) {
      return unauthorized();
    }

    const body: unknown = await req.json();
    const parsed = bulkAssignFollowUpsSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.flatten());

    const { searchParams } = new URL(req.url);
    const resolved = await resolvePortalStoreIdForSession(
      session,
      searchParams.get("storeId"),
    );
    if (resolved instanceof NextResponse) return resolved;

    const result = await bulkAssignFollowUps({
      storeId: resolved,
      targetStaffId: parsed.data.targetStaffId,
      followUpIds: parsed.data.followUpIds,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof CustomerAssignmentError) {
      return badRequest({ _errors: [error.message] }, error.message);
    }
    return handleRouteError(error);
  }
}

import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-handler";
import {
  badRequest,
  getServerSession,
  notFound,
  requireRole,
  unauthorized,
} from "@/lib/auth/session";
import {
  STAFF_CALLS_ROLES,
  requireStaffCallsContext,
} from "@/lib/auth/resolve-staff";
import { resolveStaffCallsStoreScope } from "@/lib/auth/resolve-personal-scope";
import { resolveStaffCallRecord } from "@/lib/services/staff-calls";

function parsePersonalScope(url: URL): boolean {
  return url.searchParams.get("personalScope") === "true";
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!requireRole(session, STAFF_CALLS_ROLES)) return unauthorized();

    const url = new URL(req.url);
    const storeId = url.searchParams.get("storeId") ?? undefined;
    const staff = await requireStaffCallsContext(session, storeId);
    if (!staff) return unauthorized();

    const customerId = url.searchParams.get("customerId") ?? undefined;
    const visitId = url.searchParams.get("visitId") ?? undefined;
    const fieldSaleId = url.searchParams.get("fieldSaleId") ?? undefined;

    if (!customerId && !visitId && !fieldSaleId) {
      return badRequest("customerId, visitId, or fieldSaleId is required");
    }

    const storeScope = resolveStaffCallsStoreScope(
      session.role,
      parsePersonalScope(url),
    );

    const item = await resolveStaffCallRecord({
      staffId: staff.staffId,
      storeId: staff.storeId,
      storeScope,
      customerId,
      visitId,
      fieldSaleId,
    });

    if (!item) return notFound("No call record found for this customer");

    return NextResponse.json(item);
  } catch (error) {
    return handleRouteError(error);
  }
}

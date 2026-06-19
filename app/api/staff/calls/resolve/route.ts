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
import { resolveStaffCallRecord } from "@/lib/services/staff-calls";

function usesStoreCallScope(role: string): boolean {
  return role === "BUSINESS_OWNER" || role === "STORE_MANAGER" || role === "MASTER_ADMIN";
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

    const item = await resolveStaffCallRecord({
      staffId: staff.staffId,
      storeId: staff.storeId,
      storeScope: usesStoreCallScope(session.role),
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

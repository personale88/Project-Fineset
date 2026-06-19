import { NextResponse } from "next/server";
import { resolvePortalStoreIdForSession } from "@/lib/auth/resolve-manager-store-id";
import {
  badRequest,
  getServerSession,
  notFound,
  requireRole,
  unauthorized,
} from "@/lib/auth/session";
import { handleRouteError } from "@/lib/api/route-handler";
import { getCustomerProfileForRequest } from "@/lib/services/customer-profile";
import { getCustomerProfileQuerySchema } from "@/lib/validations/customer.schema";
import { requireStaffContext } from "@/lib/auth/resolve-staff";

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!requireRole(session, ["STORE_MANAGER", "BUSINESS_OWNER", "MASTER_ADMIN", "STAFF"])) {
      return unauthorized();
    }

    const { searchParams } = new URL(req.url);
    const query = getCustomerProfileQuerySchema.safeParse(
      Object.fromEntries(searchParams.entries()),
    );
    if (!query.success) return badRequest(query.error.flatten());

    let storeId: string;
    if (session.role === "STAFF") {
      const staff = await requireStaffContext(session);
      if (!staff) return unauthorized();
      storeId = staff.storeId;
    } else if (session.role === "MASTER_ADMIN") {
      const adminStoreId = searchParams.get("storeId") ?? undefined;
      if (!adminStoreId) {
        return badRequest({ message: "storeId is required for admin profile lookup" });
      }
      storeId = adminStoreId;
    } else {
      const resolved = await resolvePortalStoreIdForSession(
        session,
        searchParams.get("storeId"),
      );
      if (resolved instanceof NextResponse) return resolved;
      storeId = resolved;
    }

    const profile = await getCustomerProfileForRequest({
      customerId: query.data.customerId,
      visitId: query.data.visitId,
      fieldSaleId: query.data.fieldSaleId,
      storeId,
    });
    if (!profile) return notFound();

    return NextResponse.json(profile);
  } catch (error) {
    return handleRouteError(error);
  }
}

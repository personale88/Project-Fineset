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
import {
  getCustomerProfile,
  resolveCustomerId,
} from "@/lib/services/customer-profile";
import { getCustomerProfileQuerySchema } from "@/lib/validations/customer.schema";

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!requireRole(session, ["STORE_MANAGER", "BUSINESS_OWNER", "MASTER_ADMIN"])) {
      return unauthorized();
    }

    const { searchParams } = new URL(req.url);
    const query = getCustomerProfileQuerySchema.safeParse(
      Object.fromEntries(searchParams.entries()),
    );
    if (!query.success) return badRequest(query.error.flatten());

    let storeId: string;
    if (session.role === "MASTER_ADMIN") {
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

    const customerId = await resolveCustomerId({
      customerId: query.data.customerId,
      visitId: query.data.visitId,
      storeId,
    });

    if (!customerId) return notFound();

    const profile = await getCustomerProfile(customerId, storeId);
    if (!profile) return notFound();

    return NextResponse.json(profile);
  } catch (error) {
    return handleRouteError(error);
  }
}

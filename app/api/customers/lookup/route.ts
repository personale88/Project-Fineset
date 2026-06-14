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
  PORTAL_ACTOR_ROLES,
  requirePortalActorContext,
} from "@/lib/auth/resolve-staff";
import { lookupCustomerByPhone } from "@/lib/services/customers";
import { lookupCustomerQuerySchema } from "@/lib/validations/analytics.schema";

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!requireRole(session, PORTAL_ACTOR_ROLES)) return unauthorized();

    const staff = await requirePortalActorContext(session);
    if (!staff) return unauthorized();

    const { searchParams } = new URL(req.url);
    const query = lookupCustomerQuerySchema.safeParse(
      Object.fromEntries(searchParams.entries()),
    );
    if (!query.success) return badRequest(query.error.flatten());

    const customer = await lookupCustomerByPhone(staff.storeId, query.data.phone);
    if (!customer) return notFound("Customer not found");

    return NextResponse.json(customer);
  } catch (error) {
    return handleRouteError(error);
  }
}

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
import { updateCustomerProfile } from "@/lib/services/customer-admin";
import { z } from "zod";

const patchCustomerSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().min(10).max(15).optional(),
  area: z.string().max(200).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getServerSession();
    if (!requireRole(session, ["STORE_MANAGER", "BUSINESS_OWNER", "MASTER_ADMIN"])) {
      return unauthorized();
    }

    const body: unknown = await req.json();
    const parsed = patchCustomerSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.flatten());

    const { searchParams } = new URL(req.url);
    let storeId: string;
    if (session.role === "MASTER_ADMIN") {
      const adminStoreId = searchParams.get("storeId");
      if (!adminStoreId) return badRequest({ storeId: ["storeId is required"] });
      storeId = adminStoreId;
    } else {
      const resolved = await resolvePortalStoreIdForSession(
        session,
        searchParams.get("storeId"),
      );
      if (resolved instanceof NextResponse) return resolved;
      storeId = resolved;
    }

    const updated = await updateCustomerProfile(id, storeId, parsed.data);
    if (!updated) return notFound("Customer not found");

    return NextResponse.json({ id: updated.id });
  } catch (error) {
    return handleRouteError(error);
  }
}

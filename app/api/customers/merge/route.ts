import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-handler";
import { resolvePortalStoreIdForSession } from "@/lib/auth/resolve-manager-store-id";
import {
  badRequest,
  getServerSession,
  requireRole,
  unauthorized,
} from "@/lib/auth/session";
import { mergeCustomers } from "@/lib/services/customer-admin";
import { z } from "zod";

const mergeSchema = z.object({
  sourceCustomerId: z.string().min(1),
  targetCustomerId: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!requireRole(session, ["BUSINESS_OWNER", "MASTER_ADMIN"])) {
      return unauthorized();
    }

    const body: unknown = await req.json();
    const parsed = mergeSchema.safeParse(body);
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

    const result = await mergeCustomers({
      storeId,
      sourceCustomerId: parsed.data.sourceCustomerId,
      targetCustomerId: parsed.data.targetCustomerId,
      actorEmail: session.email,
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}

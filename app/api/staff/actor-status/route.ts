import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-handler";
import {
  getServerSession,
  requireRole,
  unauthorized,
} from "@/lib/auth/session";
import { requirePortalActorContext } from "@/lib/auth/resolve-staff";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!requireRole(session, ["STORE_MANAGER"])) {
      return unauthorized();
    }

    const actor = await requirePortalActorContext(session);
    return NextResponse.json({
      linked: Boolean(actor),
      staffId: actor?.staffId ?? null,
      storeId: actor?.storeId ?? null,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-handler";
import {
  getServerSession,
  notFound,
  requireRole,
  unauthorized,
} from "@/lib/auth/session";
import { resolvePortalStoreIdForSession } from "@/lib/auth/resolve-manager-store-id";
import {
  listOpenCorrectionRequests,
  resolveCorrectionRequest,
} from "@/lib/services/correction-requests";

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!requireRole(session, ["STORE_MANAGER", "BUSINESS_OWNER", "MASTER_ADMIN"])) {
      return unauthorized();
    }

    const storeId = await resolvePortalStoreIdForSession(
      session,
      new URL(req.url).searchParams.get("storeId"),
    );
    if (storeId instanceof NextResponse) return storeId;

    const data = await listOpenCorrectionRequests(storeId);
    return NextResponse.json({ data });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession();
    if (!requireRole(session, ["STORE_MANAGER", "BUSINESS_OWNER", "MASTER_ADMIN"])) {
      return unauthorized();
    }

    const url = new URL(req.url);
    const storeId = await resolvePortalStoreIdForSession(
      session,
      url.searchParams.get("storeId"),
    );
    if (storeId instanceof NextResponse) return storeId;

    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ message: "id is required" }, { status: 400 });
    }

    const updated = await resolveCorrectionRequest({ id, storeId });
    if (!updated) return notFound();

    return NextResponse.json(updated);
  } catch (error) {
    return handleRouteError(error);
  }
}

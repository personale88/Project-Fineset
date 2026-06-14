import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-handler";
import { resolvePortalStoreIdForSession } from "@/lib/auth/resolve-manager-store-id";
import {
  badRequest,
  getServerSession,
  requireRole,
  unauthorized,
} from "@/lib/auth/session";
import { listCustomers } from "@/lib/services/customers";
import { getCustomersQuerySchema } from "@/lib/validations/analytics.schema";

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!requireRole(session, ["STORE_MANAGER", "BUSINESS_OWNER", "MASTER_ADMIN"])) {
      return unauthorized();
    }

    const { searchParams } = new URL(req.url);
    const query = getCustomersQuerySchema.safeParse(
      Object.fromEntries(searchParams.entries()),
    );
    if (!query.success) return badRequest(query.error.flatten());

    let storeId: string | undefined;

    if (session.role === "MASTER_ADMIN") {
      storeId = query.data.storeId;
    } else {
      const resolved = await resolvePortalStoreIdForSession(
        session,
        query.data.storeId ?? searchParams.get("storeId"),
      );
      if (resolved instanceof NextResponse) return resolved;
      storeId = resolved;
    }

    const { data, total } = await listCustomers({
      storeId,
      page: query.data.page,
      pageSize: query.data.pageSize,
      search: query.data.search,
    });

    return NextResponse.json({
      data,
      total,
      page: query.data.page,
      pageSize: query.data.pageSize,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

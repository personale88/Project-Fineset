import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-handler";
import { isPortalDataReadBlockedForSession } from "@/lib/auth/billing-access-guard";
import { resolvePortalStoreIdForSession } from "@/lib/auth/resolve-manager-store-id";
import {
  badRequest,
  getServerSession,
  requireRole,
  unauthorized,
} from "@/lib/auth/session";
import { requireStaffContext } from "@/lib/auth/resolve-staff";
import { listCustomers } from "@/lib/services/customers";
import { getCustomersQuerySchema } from "@/lib/validations/analytics.schema";

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!requireRole(session, ["STORE_MANAGER", "BUSINESS_OWNER", "MASTER_ADMIN", "STAFF"])) {
      return unauthorized();
    }

    const { searchParams } = new URL(req.url);
    const query = getCustomersQuerySchema.safeParse(
      Object.fromEntries(searchParams.entries()),
    );
    if (!query.success) return badRequest(query.error.flatten());

    let storeId: string | undefined;
    let staffId: string | undefined;

    if (session.role === "STAFF") {
      const staff = await requireStaffContext(session);
      if (!staff) return unauthorized();
      storeId = staff.storeId;
      if (query.data.scope === "mine") {
        staffId = staff.staffId;
      }
    } else if (session.role === "MASTER_ADMIN") {
      storeId = query.data.storeId;
    } else {
      const resolved = await resolvePortalStoreIdForSession(
        session,
        query.data.storeId ?? searchParams.get("storeId"),
      );
      if (resolved instanceof NextResponse) return resolved;
      storeId = resolved;
    }

    if (storeId) {
      const blocked = await isPortalDataReadBlockedForSession(session, storeId);
      if (blocked) {
        return NextResponse.json({
          data: [],
          total: 0,
          page: query.data.page,
          pageSize: query.data.pageSize,
          billingRestricted: true,
        });
      }
    }

    const { data, total } = await listCustomers({
      storeId,
      staffId,
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

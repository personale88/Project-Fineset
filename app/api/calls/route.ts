import { NextResponse } from "next/server";
import {
  badRequest,
  getServerSession,
  requireRole,
  unauthorized,
} from "@/lib/auth/session";
import { handleRouteError } from "@/lib/api/route-handler";
import { isPortalDataReadBlocked } from "@/lib/auth/billing-access-guard";
import { resolveStorePortalStoreId } from "@/lib/auth/resolve-manager-store-id";
import { listPortalCalls } from "@/lib/services/portal-calls";
import { portalCallsQuerySchema } from "@/lib/validations/portal-calls.schema";

export async function GET(req: Request) {
  const startedAt = Date.now();
  try {
    const session = await getServerSession();
    if (!requireRole(session, ["STORE_MANAGER", "BUSINESS_OWNER", "MASTER_ADMIN"])) {
      return unauthorized();
    }

    const { searchParams } = new URL(req.url);
    const query = portalCallsQuerySchema.safeParse(
      Object.fromEntries(searchParams.entries()),
    );
    if (!query.success) return badRequest(query.error.flatten());

    let storeId: string | undefined;
    if (session.role === "STORE_MANAGER" || session.role === "BUSINESS_OWNER") {
      const resolved = await resolveStorePortalStoreId(
        session,
        query.data.storeId,
      );
      if (resolved instanceof NextResponse) return resolved;
      storeId = resolved;
    } else if (query.data.storeId) {
      storeId = query.data.storeId;
    }

    if (storeId) {
      const blocked = await isPortalDataReadBlocked(session, storeId);
      if (blocked) {
        return NextResponse.json({
          data: [],
          total: 0,
          page: query.data.page,
          pageSize: query.data.pageSize,
          year: query.data.year,
          month: query.data.month,
          filters: {
            segments: [],
            valueTiers: [],
            purchaseStatuses: [],
          },
          billingRestricted: true,
        });
      }
    }

    const result = await listPortalCalls({
      ...query.data,
      storeId,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[api.calls] failed", {
      elapsedMs: Date.now() - startedAt,
      error,
    });
    return handleRouteError(error);
  }
}

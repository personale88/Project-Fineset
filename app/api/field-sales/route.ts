import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import {
  badRequest,
  getServerSession,
  requireRole,
  unauthorized,
} from "@/lib/auth/session";
import { handleRouteError } from "@/lib/api/route-handler";
import { resolveStorePortalStoreId } from "@/lib/auth/resolve-manager-store-id";
import { resolvePersonalStaffId } from "@/lib/auth/resolve-personal-scope";
import {
  PORTAL_ACTOR_ROLES,
  requirePortalActorContext,
  requireStaffContext,
} from "@/lib/auth/resolve-staff";
import { createFieldSale, listFieldSales } from "@/lib/services/field-sales";
import {
  createFieldSaleSchema,
  getFieldSalesQuerySchema,
} from "@/lib/validations/field-sale.schema";

export async function GET(req: Request) {
  const startedAt = Date.now();
  try {
    const session = await getServerSession();
    if (!requireRole(session, ["STAFF", "STORE_MANAGER", "BUSINESS_OWNER", "MASTER_ADMIN"])) {
      return unauthorized();
    }

    const { searchParams } = new URL(req.url);
    const query = getFieldSalesQuerySchema.safeParse(
      Object.fromEntries(searchParams.entries()),
    );
    if (!query.success) return badRequest(query.error.flatten());

    let storeId: string | undefined;
    let staffId = query.data.staffId;

    if (session.role === "STAFF") {
      const staff = await requireStaffContext(session);
      if (!staff) return unauthorized();
      storeId = staff.storeId;
      staffId = staff.staffId;
    } else if (session.role === "STORE_MANAGER" || session.role === "BUSINESS_OWNER") {
      const resolved = await resolveStorePortalStoreId(
        session,
        query.data.storeId,
      );
      if (resolved instanceof NextResponse) return resolved;
      storeId = resolved;
      const personalStaffId = await resolvePersonalStaffId(session, query.data.personalScope);
      if (personalStaffId) staffId = personalStaffId;
    } else if (query.data.storeId) {
      storeId = query.data.storeId;
    }

    const result = await listFieldSales({
      ...query.data,
      storeId,
      staffId,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[api.field-sales] failed", {
      elapsedMs: Date.now() - startedAt,
      error,
    });
    return handleRouteError(error);
  }
}

export async function POST(req: Request) {
  const startedAt = Date.now();
  try {
    const session = await getServerSession();
    if (!requireRole(session, PORTAL_ACTOR_ROLES)) return unauthorized();

    const staff = await requirePortalActorContext(session);
    if (!staff) return unauthorized();

    const body: unknown = await req.json();
    const parsed = createFieldSaleSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.flatten());

    const fieldSale = await createFieldSale({
      ...parsed.data,
      storeId: staff.storeId,
      staffId: staff.staffId,
    });

    revalidateTag(`store:${staff.storeId}`, { expire: 0 });
    revalidateTag("analytics", { expire: 0 });

    return NextResponse.json(fieldSale, { status: 201 });
  } catch (error) {
    console.error("[api.field-sales] create failed", {
      elapsedMs: Date.now() - startedAt,
      error,
    });
    return handleRouteError(error);
  }
}

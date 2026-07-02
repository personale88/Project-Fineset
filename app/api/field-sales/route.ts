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
import { resolvePersonalStaffId, isUnlinkedManagerPersonalScope } from "@/lib/auth/resolve-personal-scope";
import {
  PORTAL_ACTOR_ROLES,
  requirePortalActorContext,
  requireStaffContext,
} from "@/lib/auth/resolve-staff";
import { createFieldSale, listFieldSales } from "@/lib/services/field-sales";
import { isPortalDataReadBlockedForSession } from "@/lib/auth/billing-access-guard";
import { resolveLocationEvidenceForSubmit } from "@/lib/field-force/resolve-location-evidence";
import { getStoreGeofence } from "@/lib/field-force/get-store-geofence";
import { FIELD_SALE_LOCATION_SETTINGS } from "@/lib/field-force/field-sale-location";
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
      if (isUnlinkedManagerPersonalScope(session, query.data.personalScope, personalStaffId)) {
        return NextResponse.json({ data: [], total: 0, page: query.data.page, pageSize: query.data.pageSize });
      }
      if (personalStaffId) staffId = personalStaffId;
    } else if (query.data.storeId) {
      storeId = query.data.storeId;
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

    const store = await getStoreGeofence(staff.storeId);
    if (!store) {
      return NextResponse.json({ message: "Store not found" }, { status: 404 });
    }

    const locationResult = await resolveLocationEvidenceForSubmit({
      recordType: "FIELD_SALE",
      locationCapture: parsed.data.locationCapture,
      locationExceptionId: parsed.data.locationExceptionId,
      settings: FIELD_SALE_LOCATION_SETTINGS,
      store,
      storeId: staff.storeId,
      staffId: staff.staffId,
      req,
    });
    if (!locationResult.ok) {
      return NextResponse.json(
        { message: locationResult.message, code: locationResult.code },
        { status: locationResult.status ?? 422 },
      );
    }

    const { locationCapture: _locationCapture, locationExceptionId: _locationExceptionId, ...fieldSaleInput } =
      parsed.data;

    const fieldSale = await createFieldSale({
      ...fieldSaleInput,
      storeId: staff.storeId,
      staffId: staff.staffId,
      locationEvidence: locationResult.evidence,
      locationExceptionId: locationResult.locationExceptionId,
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

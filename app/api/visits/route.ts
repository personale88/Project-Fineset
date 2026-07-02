import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { unauthorized } from "@/lib/auth/session";
import {
  PORTAL_ACTOR_ROLES,
  requirePortalActorContext,
  requireStaffContext,
} from "@/lib/auth/resolve-staff";
import { checkWriteRateLimit, getRequestIdentifier } from "@/lib/rate-limit";
import { resolveStorePortalStoreId } from "@/lib/auth/resolve-manager-store-id";
import { resolvePersonalStaffId, isUnlinkedManagerPersonalScope } from "@/lib/auth/resolve-personal-scope";
import { createVisit, listVisits } from "@/lib/services/visits";
import { withAuthQuery, handleRouteError } from "@/lib/api/route-handler";
import { isPortalDataReadBlockedForSession, isPortalDataWriteBlockedForSession, billingRestrictedMutationResponse } from "@/lib/auth/billing-access-guard";
import { createPerfTimer, logPerf } from "@/lib/perf/timing";
import { getPlatformSettings } from "@/lib/services/platform-settings";
import { getStoreGeofence } from "@/lib/field-force/get-store-geofence";
import { resolveLocationEvidenceForSubmit } from "@/lib/field-force/resolve-location-evidence";
import { getServerSession, requireRole, badRequest } from "@/lib/auth/session";
import {
  createVisitSchema,
  getVisitsQuerySchema,
} from "@/lib/validations/visit.schema";

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!requireRole(session, PORTAL_ACTOR_ROLES)) return unauthorized();

    const staff = await requirePortalActorContext(session);
    if (!staff) return unauthorized();

    const body: unknown = await req.json();
    const parsed = createVisitSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.flatten());

    const identifier = await getRequestIdentifier();
    const writeLimit = await checkWriteRateLimit(identifier);
    if (!writeLimit.success) {
      return NextResponse.json({ message: "Too many requests" }, { status: 429 });
    }

    if (await isPortalDataWriteBlockedForSession(session, staff.storeId)) {
      return billingRestrictedMutationResponse();
    }

    const platformSettings = await getPlatformSettings({ fresh: true });
    const store = await getStoreGeofence(staff.storeId);
    if (!store) {
      return NextResponse.json({ message: "Store not found" }, { status: 404 });
    }

    const locationResult = await resolveLocationEvidenceForSubmit({
      recordType: "VISIT",
      locationCapture: parsed.data.locationCapture,
      locationExceptionId: parsed.data.locationExceptionId,
      settings: platformSettings.fieldForce,
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

    const {
      locationCapture: _locationCapture,
      locationExceptionId: _locationExceptionId,
      ...visitInput
    } = parsed.data;

    const visit = await createVisit({
      ...visitInput,
      storeId: staff.storeId,
      staffId: staff.staffId,
      locationEvidence: locationResult.evidence,
      locationExceptionId: locationResult.locationExceptionId,
    });

    revalidateTag(`store:${staff.storeId}`, { expire: 0 });
    revalidateTag("analytics", { expire: 0 });

    return NextResponse.json(visit, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}

export const GET = withAuthQuery(
  ["STAFF", "STORE_MANAGER", "BUSINESS_OWNER", "MASTER_ADMIN"] as const,
  getVisitsQuerySchema,
  async (session, query) => {
    const timer = createPerfTimer();
    timer.mark("auth");

    let storeId: string | undefined;
    let staffId = query.staffId;

    if (session.role === "STAFF") {
      const staff = await requireStaffContext(session);
      if (!staff) return unauthorized();
      storeId = staff.storeId;
      staffId = staff.staffId;
    } else if (session.role === "STORE_MANAGER" || session.role === "BUSINESS_OWNER") {
      const resolved = await resolveStorePortalStoreId(
        session,
        query.storeId,
      );
      if (resolved instanceof NextResponse) return resolved;
      storeId = resolved;
      const personalStaffId = await resolvePersonalStaffId(session, query.personalScope);
      if (isUnlinkedManagerPersonalScope(session, query.personalScope, personalStaffId)) {
        return NextResponse.json({ data: [], total: 0, page: query.page, pageSize: query.pageSize });
      }
      if (personalStaffId) staffId = personalStaffId;
    } else if (query.storeId) {
      storeId = query.storeId;
    }

    if (storeId) {
      const blocked = await isPortalDataReadBlockedForSession(session, storeId);
      if (blocked) {
        return NextResponse.json({
          data: [],
          total: 0,
          page: query.page,
          pageSize: query.pageSize,
          billingRestricted: true,
        });
      }
    }

    const { data, total } = await listVisits({
      storeId,
      page: query.page,
      pageSize: query.pageSize,
      search: query.search,
      startDate: query.startDate,
      endDate: query.endDate,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      followUpOnly: query.followUpOnly,
      staffId,
      purchaseStatus: query.purchaseStatus,
      visitType: query.visitType,
      customerType: query.customerType,
      sourceChannel: query.sourceChannel,
    });
    timer.mark("listVisits");

    logPerf("/api/visits", timer.finish());

    return NextResponse.json({
      data,
      total,
      page: query.page,
      pageSize: query.pageSize,
    });
  },
);

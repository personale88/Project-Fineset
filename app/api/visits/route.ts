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
import { resolvePersonalStaffId } from "@/lib/auth/resolve-personal-scope";
import { createVisit, listVisits } from "@/lib/services/visits";
import { withAuthQuery, withAuthValidation } from "@/lib/api/route-handler";
import { createPerfTimer, logPerf } from "@/lib/perf/timing";
import {
  createVisitSchema,
  getVisitsQuerySchema,
} from "@/lib/validations/visit.schema";

export const POST = await withAuthValidation(
  PORTAL_ACTOR_ROLES,
  createVisitSchema,
  async (session, data) => {
    const staff = await requirePortalActorContext(session);
    if (!staff) return unauthorized();

    const identifier = await getRequestIdentifier();
    const writeLimit = await checkWriteRateLimit(identifier);
    if (!writeLimit.success) {
      return NextResponse.json(
        { message: "Too many requests" },
        { status: 429 },
      );
    }

    const visit = await createVisit({
      ...data,
      storeId: staff.storeId,
      staffId: staff.staffId,
    });

    revalidateTag(`store:${staff.storeId}`, { expire: 0 });
    revalidateTag("analytics", { expire: 0 });

    return NextResponse.json(visit, { status: 201 });
  },
);

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
      if (personalStaffId) staffId = personalStaffId;
    } else if (query.storeId) {
      storeId = query.storeId;
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

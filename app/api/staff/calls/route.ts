import { NextResponse } from "next/server";
import {
  badRequest,
  getServerSession,
  requireRole,
  unauthorized,
} from "@/lib/auth/session";
import { handleRouteError } from "@/lib/api/route-handler";
import { isPortalDataReadBlockedForSession } from "@/lib/auth/billing-access-guard";
import {
  STAFF_CALLS_ROLES,
  requireStaffCallsContext,
} from "@/lib/auth/resolve-staff";
import { listStaffCalls } from "@/lib/services/staff-calls";
import { staffCallListQuerySchema } from "@/lib/validations/staff-calls.schema";
import { resolveStaffCallsStoreScope } from "@/lib/auth/resolve-personal-scope";
import { prisma } from "@/lib/db/prisma";

async function assertViewStaffInStore(viewStaffId: string, storeId: string) {
  const member = await prisma.staff.findFirst({
    where: { id: viewStaffId, storeId, isActive: true },
    select: { id: true },
  });
  return Boolean(member);
}

export async function GET(req: Request) {
  const startedAt = Date.now();
  try {
    const session = await getServerSession();
    if (!requireRole(session, STAFF_CALLS_ROLES)) return unauthorized();

    const { searchParams } = new URL(req.url);
    const query = staffCallListQuerySchema.safeParse(
      Object.fromEntries(searchParams.entries()),
    );
    if (!query.success) return badRequest(query.error.flatten());

    const staff = await requireStaffCallsContext(
      session,
      query.data.storeId,
      query.data.personalScope,
    );
    if (!staff) return unauthorized();

    const blocked = await isPortalDataReadBlockedForSession(session, staff.storeId);
    if (blocked) {
      return NextResponse.json({
        data: [],
        total: 0,
        page: query.data.page,
        pageSize: query.data.pageSize,
        filters: {
          master: { all: 0, store: 0, user: 0 },
          segments: [],
          valueTiers: [],
          queues: [],
        },
        billingRestricted: true,
      });
    }

    if (query.data.viewStaffId) {
      const valid = await assertViewStaffInStore(query.data.viewStaffId, staff.storeId);
      if (!valid) return badRequest("Invalid staff filter");
    }

    const result = await listStaffCalls({
      staffId: staff.staffId,
      storeId: staff.storeId,
      storeScope: resolveStaffCallsStoreScope(session.role, query.data.personalScope),
      viewStaffId: query.data.viewStaffId,
      master: query.data.master,
      segment: query.data.segment,
      valueTier: query.data.valueTier,
      queue: query.data.queue,
      birthday: query.data.birthday,
      anniversary: query.data.anniversary,
      year: query.data.year,
      month: query.data.month,
      page: query.data.page,
      pageSize: query.data.pageSize,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[api.staff.calls] failed", {
      elapsedMs: Date.now() - startedAt,
      error,
    });
    return handleRouteError(error);
  }
}

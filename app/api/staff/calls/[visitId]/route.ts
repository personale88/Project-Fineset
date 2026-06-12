import { NextResponse } from "next/server";
import {
  badRequest,
  getServerSession,
  notFound,
  requireRole,
  unauthorized,
} from "@/lib/auth/session";
import {
  STAFF_CALLS_ROLES,
  requireStaffCallsContext,
} from "@/lib/auth/resolve-staff";
import {
  recordStaffCallOutcome,
  revealStaffCallPhone,
} from "@/lib/services/staff-calls";
import {
  staffCallMasterFilterSchema,
  staffCallOutcomeSchema,
} from "@/lib/validations/staff-calls.schema";
import type { StaffCallMasterSource } from "@/types";

interface RouteParams {
  params: Promise<{ visitId: string }>;
}

function parseMasterSource(value: string | null): StaffCallMasterSource | null {
  const parsed = staffCallMasterFilterSchema.safeParse(value);
  if (!parsed.success || parsed.data === "ALL") {
    return null;
  }
  return parsed.data;
}

export async function POST(req: Request, { params }: RouteParams) {
  const { visitId: recordId } = await params;
  const session = await getServerSession();
  if (!requireRole(session, STAFF_CALLS_ROLES)) return unauthorized();

  const storeId = new URL(req.url).searchParams.get("storeId") ?? undefined;
  const staff = await requireStaffCallsContext(session, storeId);
  if (!staff) return unauthorized();

  const masterSource = parseMasterSource(new URL(req.url).searchParams.get("masterSource"));
  if (!masterSource) {
    return badRequest("masterSource is required");
  }

  const body: unknown = await req.json();
  const parsed = staffCallOutcomeSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.flatten());

  const result = await recordStaffCallOutcome({
    recordId,
    masterSource,
    staffId: staff.staffId,
    storeId: staff.storeId,
    ...parsed.data,
  });

  if (!result) return notFound("Call record not found");

  return NextResponse.json(result);
}

export async function GET(req: Request, { params }: RouteParams) {
  const { visitId: recordId } = await params;
  const session = await getServerSession();
  if (!requireRole(session, STAFF_CALLS_ROLES)) return unauthorized();

  const storeId = new URL(req.url).searchParams.get("storeId") ?? undefined;
  const staff = await requireStaffCallsContext(session, storeId);
  if (!staff) return unauthorized();

  const masterSource = parseMasterSource(new URL(req.url).searchParams.get("masterSource"));
  if (!masterSource) {
    return badRequest("masterSource is required");
  }

  const result = await revealStaffCallPhone({
    recordId,
    masterSource,
    staffId: staff.staffId,
    storeId: staff.storeId,
  });

  if (!result) return notFound("Phone number unavailable for this customer");

  return NextResponse.json(result);
}

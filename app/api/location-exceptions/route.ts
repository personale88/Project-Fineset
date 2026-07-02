import { NextResponse } from "next/server";
import { z } from "zod";
import {
  badRequest,
  getServerSession,
  requireRole,
  unauthorized,
} from "@/lib/auth/session";
import { handleRouteError } from "@/lib/api/route-handler";
import { requirePortalActorContext, requireStaffContext } from "@/lib/auth/resolve-staff";
import { resolveStorePortalStoreId } from "@/lib/auth/resolve-manager-store-id";
import {
  createLocationCaptureException,
  getActiveLocationCaptureException,
  LocationCaptureExceptionError,
} from "@/lib/services/location-capture-exceptions";

const createSchema = z.object({
  staffId: z.string().cuid(),
  recordType: z.enum(["FIELD_SALE", "VISIT"]),
  reason: z.string().max(500).optional(),
});

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!requireRole(session, ["STAFF", "STORE_MANAGER", "BUSINESS_OWNER"])) {
      return unauthorized();
    }

    const { searchParams } = new URL(req.url);
    const recordType = searchParams.get("recordType");
    if (recordType !== "FIELD_SALE" && recordType !== "VISIT") {
      return badRequest({ recordType: ["recordType is required"] });
    }

    let storeId: string;
    let staffId: string;

    if (session.role === "STAFF") {
      const staff = await requireStaffContext(session);
      if (!staff) return unauthorized();
      storeId = staff.storeId;
      staffId = staff.staffId;
    } else {
      const resolved = await resolveStorePortalStoreId(session, searchParams.get("storeId") ?? undefined);
      if (resolved instanceof NextResponse) return resolved;
      storeId = resolved;
      const targetStaffId = searchParams.get("staffId");
      if (!targetStaffId) {
        return badRequest({ staffId: ["staffId is required for manager lookup"] });
      }
      staffId = targetStaffId;
    }

    const exception = await getActiveLocationCaptureException({
      storeId,
      staffId,
      recordType,
    });

    return NextResponse.json(exception);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!requireRole(session, ["STORE_MANAGER", "BUSINESS_OWNER", "MASTER_ADMIN"])) {
      return unauthorized();
    }

    const body: unknown = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.flatten());

    const { searchParams } = new URL(req.url);
    const resolved = await resolveStorePortalStoreId(session, searchParams.get("storeId") ?? undefined);
    if (resolved instanceof NextResponse) return resolved;

    const exception = await createLocationCaptureException({
      storeId: resolved,
      staffId: parsed.data.staffId,
      recordType: parsed.data.recordType,
      issuedByAuthId: session.userId,
      issuedByEmail: session.email,
      reason: parsed.data.reason,
    });

    return NextResponse.json(exception, { status: 201 });
  } catch (error) {
    if (error instanceof LocationCaptureExceptionError) {
      return NextResponse.json({ message: error.message, code: error.code }, { status: error.status });
    }
    return handleRouteError(error);
  }
}

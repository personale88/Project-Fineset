import type { LocationCaptureRecordType } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { logAuthEvent } from "@/lib/auth/audit";
import type { FieldSaleLocationEvidence } from "@/lib/field-force/location-capture";
import { resolveClientIp } from "@/lib/field-force/location-capture";

const DEFAULT_TTL_HOURS = 2;

export class LocationCaptureExceptionError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status = 422,
  ) {
    super(message);
    this.name = "LocationCaptureExceptionError";
  }
}

export async function createLocationCaptureException(params: {
  storeId: string;
  staffId: string;
  recordType: LocationCaptureRecordType;
  issuedByAuthId?: string | null;
  issuedByEmail?: string | null;
  reason?: string | null;
  ttlHours?: number;
}) {
  const staff = await prisma.staff.findFirst({
    where: { id: params.staffId, storeId: params.storeId, isActive: true },
    select: { id: true, name: true },
  });
  if (!staff) {
    throw new LocationCaptureExceptionError("Staff member not found for this store.", "staff_not_found", 404);
  }

  const expiresAt = new Date(Date.now() + (params.ttlHours ?? DEFAULT_TTL_HOURS) * 60 * 60 * 1000);

  const exception = await prisma.locationCaptureException.create({
    data: {
      storeId: params.storeId,
      staffId: params.staffId,
      recordType: params.recordType,
      issuedByAuthId: params.issuedByAuthId ?? undefined,
      issuedByEmail: params.issuedByEmail ?? undefined,
      reason: params.reason?.trim() || null,
      expiresAt,
    },
  });

  await logAuthEvent({
    event: "FIELD_FORCE_GPS_EXCEPTION_ISSUED",
    authId: params.issuedByAuthId ?? undefined,
    email: params.issuedByEmail ?? undefined,
    metadata: {
      exceptionId: exception.id,
      storeId: params.storeId,
      staffId: params.staffId,
      staffName: staff.name,
      recordType: params.recordType,
      expiresAt: expiresAt.toISOString(),
    },
  });

  return exception;
}

export async function getActiveLocationCaptureException(params: {
  storeId: string;
  staffId: string;
  recordType: LocationCaptureRecordType;
}) {
  const now = new Date();
  return prisma.locationCaptureException.findFirst({
    where: {
      storeId: params.storeId,
      staffId: params.staffId,
      recordType: params.recordType,
      usedAt: null,
      expiresAt: { gt: now },
    },
    orderBy: { expiresAt: "desc" },
  });
}

export async function resolveLocationCaptureException(params: {
  exceptionId: string;
  storeId: string;
  staffId: string;
  recordType: LocationCaptureRecordType;
  req: Request;
}): Promise<FieldSaleLocationEvidence> {
  const exception = await prisma.locationCaptureException.findFirst({
    where: {
      id: params.exceptionId,
      storeId: params.storeId,
      staffId: params.staffId,
      recordType: params.recordType,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (!exception) {
    throw new LocationCaptureExceptionError(
      "GPS exception is invalid, expired, or already used.",
      "location_exception_invalid",
    );
  }

  return {
    submissionLatitude: null,
    submissionLongitude: null,
    locationAccuracyMeters: null,
    locationCapturedAt: null,
    locationStatus: "EXEMPT",
    locationAddress: null,
    submissionIp: resolveClientIp(params.req),
    submissionUserAgent: params.req.headers.get("user-agent")?.slice(0, 500) ?? null,
    distanceFromStoreMeters: null,
    outsideApprovedArea: null,
  };
}

export async function markLocationCaptureExceptionUsed(
  exceptionId: string,
  tx: Prisma.TransactionClient,
): Promise<void> {
  await tx.locationCaptureException.updateMany({
    where: { id: exceptionId, usedAt: null },
    data: { usedAt: new Date() },
  });
}

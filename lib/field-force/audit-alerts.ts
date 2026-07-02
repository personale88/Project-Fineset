import { logAuthEvent } from "@/lib/auth/audit";
import type { FieldSaleLocationEvidence } from "@/lib/field-force/location-capture";

interface FieldForceAuditContext {
  storeId: string;
  staffId: string;
  recordType: "FIELD_SALE" | "VISIT";
  recordId: string;
  staffEmail?: string | null;
  authId?: string | null;
}

export async function logFieldForceLocationAudit(
  evidence: FieldSaleLocationEvidence,
  context: FieldForceAuditContext,
): Promise<void> {
  const baseMetadata = {
    storeId: context.storeId,
    staffId: context.staffId,
    recordType: context.recordType,
    recordId: context.recordId,
    locationStatus: evidence.locationStatus,
    outsideApprovedArea: evidence.outsideApprovedArea,
    distanceFromStoreMeters: evidence.distanceFromStoreMeters,
  };

  if (
    evidence.locationStatus === "PERMISSION_DENIED" ||
    evidence.locationStatus === "UNAVAILABLE" ||
    evidence.locationStatus === "POOR_ACCURACY" ||
    evidence.locationStatus === "EXEMPT"
  ) {
    await logAuthEvent({
      event: "FIELD_FORCE_GPS_DENIED",
      authId: context.authId ?? undefined,
      email: context.staffEmail ?? undefined,
      ip: evidence.submissionIp ?? undefined,
      userAgent: evidence.submissionUserAgent ?? undefined,
      metadata: baseMetadata,
    });
  }

  if (evidence.outsideApprovedArea) {
    await logAuthEvent({
      event: "FIELD_FORCE_GEOFENCE_VIOLATION",
      authId: context.authId ?? undefined,
      email: context.staffEmail ?? undefined,
      ip: evidence.submissionIp ?? undefined,
      userAgent: evidence.submissionUserAgent ?? undefined,
      metadata: {
        ...baseMetadata,
        submissionLatitude: evidence.submissionLatitude,
        submissionLongitude: evidence.submissionLongitude,
        locationAddress: evidence.locationAddress,
      },
    });
  }
}

import {
  enrichLocationEvidenceWithAddress,
  validateFieldSaleLocationCapture,
  validateVisitLocationCapture,
  type FieldSaleLocationEvidence,
} from "@/lib/field-force/location-capture";
import type { PlatformSettingsFieldForce } from "@/lib/platform/types";
import type { StoreGeofence } from "@/lib/field-force/location-capture";
import type { LocationCapturePayload } from "@/lib/validations/location-capture.schema";
import {
  LocationCaptureExceptionError,
  resolveLocationCaptureException,
} from "@/lib/services/location-capture-exceptions";
import type { LocationCaptureRecordType } from "@prisma/client";

export type ResolveLocationEvidenceResult =
  | {
      ok: true;
      evidence: FieldSaleLocationEvidence;
      locationExceptionId?: string;
    }
  | { ok: false; message: string; code: string; status?: number };

export async function resolveLocationEvidenceForSubmit(params: {
  recordType: LocationCaptureRecordType;
  locationCapture?: LocationCapturePayload | null;
  locationExceptionId?: string | null;
  settings: PlatformSettingsFieldForce;
  store: StoreGeofence;
  storeId: string;
  staffId: string;
  req: Request;
}): Promise<ResolveLocationEvidenceResult> {
  const { recordType, locationExceptionId, settings, store, storeId, staffId, req } = params;

  if (locationExceptionId) {
    try {
      const evidence = await resolveLocationCaptureException({
        exceptionId: locationExceptionId,
        storeId,
        staffId,
        recordType,
        req,
      });
      return { ok: true, evidence, locationExceptionId };
    } catch (error) {
      if (error instanceof LocationCaptureExceptionError) {
        return { ok: false, message: error.message, code: error.code, status: error.status };
      }
      throw error;
    }
  }

  const validate =
    recordType === "FIELD_SALE"
      ? validateFieldSaleLocationCapture
      : validateVisitLocationCapture;

  const locationResult = validate({
    capture: params.locationCapture ?? null,
    settings,
    store,
    req,
  });

  if (!locationResult.ok) {
    return locationResult;
  }

  const evidence = await enrichLocationEvidenceWithAddress(locationResult.evidence);
  return { ok: true, evidence };
}

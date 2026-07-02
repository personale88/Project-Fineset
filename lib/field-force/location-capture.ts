import type { LocationCaptureStatus } from "@prisma/client";
import type { PlatformSettingsFieldForce } from "@/lib/platform/types";

export type ClientLocationCaptureStatus =
  | "DETECTED"
  | "PERMISSION_DENIED"
  | "UNAVAILABLE"
  | "POOR_ACCURACY";

export interface FieldSaleLocationCaptureInput {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  capturedAt: Date;
  status: ClientLocationCaptureStatus;
}

export interface FieldSaleLocationEvidence {
  submissionLatitude: number | null;
  submissionLongitude: number | null;
  locationAccuracyMeters: number | null;
  locationCapturedAt: Date | null;
  locationStatus: LocationCaptureStatus;
  locationAddress: string | null;
  submissionIp: string | null;
  submissionUserAgent: string | null;
  distanceFromStoreMeters: number | null;
  outsideApprovedArea: boolean | null;
}

export interface StoreGeofence {
  latitude: number | null;
  longitude: number | null;
  geofenceRadiusMeters: number | null;
}

const EARTH_RADIUS_METERS = 6_371_000;

export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(a));
}

export function isSuspiciousCoordinate(latitude: number, longitude: number): boolean {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return true;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return true;
  }
  if (Math.abs(latitude) < 0.0001 && Math.abs(longitude) < 0.0001) return true;
  return false;
}

export function resolveClientIp(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  const candidate = forwarded?.split(",")[0]?.trim() || req.headers.get("x-real-ip")?.trim();
  return candidate || null;
}

export function computeGeofenceResult(
  capture: Pick<FieldSaleLocationCaptureInput, "latitude" | "longitude">,
  store: StoreGeofence,
): { distanceFromStoreMeters: number | null; outsideApprovedArea: boolean | null } {
  if (
    store.latitude == null ||
    store.longitude == null ||
    store.geofenceRadiusMeters == null ||
    store.geofenceRadiusMeters <= 0
  ) {
    return { distanceFromStoreMeters: null, outsideApprovedArea: null };
  }

  const distanceFromStoreMeters = haversineDistanceMeters(
    capture.latitude,
    capture.longitude,
    store.latitude,
    store.longitude,
  );

  return {
    distanceFromStoreMeters,
    outsideApprovedArea: distanceFromStoreMeters > store.geofenceRadiusMeters,
  };
}

export type ValidateFieldSaleLocationResult =
  | { ok: true; evidence: FieldSaleLocationEvidence }
  | { ok: false; message: string; code: string };

export function validateFieldSaleLocationCapture(params: {
  capture: FieldSaleLocationCaptureInput | null | undefined;
  settings: PlatformSettingsFieldForce;
  store: StoreGeofence;
  req: Request;
  reference?: Date;
  requireGps?: boolean;
}): ValidateFieldSaleLocationResult {
  const requireGps = params.requireGps ?? params.settings.requireGpsForFieldSales;
  return validateLocationCapture({
    ...params,
    requireGps,
  });
}

export function validateVisitLocationCapture(params: {
  capture: FieldSaleLocationCaptureInput | null | undefined;
  settings: PlatformSettingsFieldForce;
  store: StoreGeofence;
  req: Request;
  reference?: Date;
  requireGps?: boolean;
}): ValidateFieldSaleLocationResult {
  const requireGps = params.requireGps ?? params.settings.requireGpsForVisits;
  return validateLocationCapture({
    ...params,
    requireGps,
  });
}

export function validateLocationCapture(params: {
  capture: FieldSaleLocationCaptureInput | null | undefined;
  settings: PlatformSettingsFieldForce;
  store: StoreGeofence;
  req: Request;
  reference?: Date;
  requireGps: boolean;
}): ValidateFieldSaleLocationResult {
  const { capture, settings, store, req, requireGps } = params;
  const reference = params.reference ?? new Date();
  const submissionIp = resolveClientIp(req);
  const submissionUserAgent = req.headers.get("user-agent")?.slice(0, 500) ?? null;

  const deniedEvidence = (status: LocationCaptureStatus): FieldSaleLocationEvidence => ({
    submissionLatitude: null,
    submissionLongitude: null,
    locationAccuracyMeters: null,
    locationCapturedAt: null,
    locationStatus: status,
    locationAddress: null,
    submissionIp,
    submissionUserAgent,
    distanceFromStoreMeters: null,
    outsideApprovedArea: null,
  });

  const allowWithoutGps = settings.allowSubmitWithoutGps || !requireGps;

  if (!capture) {
    if (allowWithoutGps) {
      return { ok: true, evidence: deniedEvidence("EXEMPT") };
    }
    return {
      ok: false,
      message: "Location is required to submit this field log.",
      code: "location_required",
    };
  }

  if (capture.status === "PERMISSION_DENIED") {
    if (allowWithoutGps) {
      return { ok: true, evidence: deniedEvidence("PERMISSION_DENIED") };
    }
    return {
      ok: false,
      message: "Location permission was denied. Enable GPS to submit this log.",
      code: "location_permission_denied",
    };
  }

  if (capture.status === "UNAVAILABLE") {
    if (allowWithoutGps) {
      return { ok: true, evidence: deniedEvidence("UNAVAILABLE") };
    }
    return {
      ok: false,
      message: "Unable to detect your location. Enable GPS and try again.",
      code: "location_unavailable",
    };
  }

  if (
    capture.status !== "DETECTED" &&
    capture.status !== "POOR_ACCURACY"
  ) {
    return {
      ok: false,
      message: "Invalid location capture status.",
      code: "location_invalid_status",
    };
  }

  if (isSuspiciousCoordinate(capture.latitude, capture.longitude)) {
    return {
      ok: false,
      message: "Invalid GPS coordinates received.",
      code: "location_invalid_coordinates",
    };
  }

  const capturedAt = new Date(capture.capturedAt);
  if (Number.isNaN(capturedAt.getTime())) {
    return {
      ok: false,
      message: "Invalid location timestamp.",
      code: "location_invalid_timestamp",
    };
  }

  const ageSeconds = Math.abs(reference.getTime() - capturedAt.getTime()) / 1000;
  if (ageSeconds > settings.maxLocationAgeSeconds) {
    return {
      ok: false,
      message: "Location reading expired. Detect location again before submitting.",
      code: "location_stale",
    };
  }

  const locationStatus =
    capture.status === "POOR_ACCURACY" ||
    capture.accuracyMeters > settings.maxAccuracyMeters
      ? "POOR_ACCURACY"
      : "DETECTED";

  const geofence = computeGeofenceResult(capture, store);

  return {
    ok: true,
    evidence: {
      submissionLatitude: capture.latitude,
      submissionLongitude: capture.longitude,
      locationAccuracyMeters: capture.accuracyMeters,
      locationCapturedAt: capturedAt,
      locationStatus,
      locationAddress: null,
      submissionIp,
      submissionUserAgent,
      distanceFromStoreMeters: geofence.distanceFromStoreMeters,
      outsideApprovedArea: geofence.outsideApprovedArea,
    },
  };
}

export function formatCoordinates(latitude: number, longitude: number): string {
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}

export async function enrichLocationEvidenceWithAddress(
  evidence: FieldSaleLocationEvidence,
): Promise<FieldSaleLocationEvidence> {
  if (
    (evidence.locationStatus !== "DETECTED" &&
      evidence.locationStatus !== "POOR_ACCURACY") ||
    evidence.submissionLatitude == null ||
    evidence.submissionLongitude == null
  ) {
    return evidence;
  }

  const { reverseGeocodeAddress } = await import("@/lib/field-force/reverse-geocode");
  const locationAddress = await reverseGeocodeAddress(
    evidence.submissionLatitude,
    evidence.submissionLongitude,
  );

  return {
    ...evidence,
    locationAddress,
  };
}

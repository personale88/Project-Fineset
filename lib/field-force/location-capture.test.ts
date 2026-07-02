import { describe, expect, it } from "vitest";
import { DEFAULT_PLATFORM_SETTINGS } from "@/lib/platform/default-settings";
import {
  computeGeofenceResult,
  haversineDistanceMeters,
  validateFieldSaleLocationCapture,
} from "@/lib/field-force/location-capture";

describe("field-force location capture", () => {
  it("computes haversine distance", () => {
    const distance = haversineDistanceMeters(12.9716, 77.5946, 12.972, 77.595);
    expect(distance).toBeGreaterThan(0);
    expect(distance).toBeLessThan(200);
  });

  it("accepts a fresh detected capture", () => {
    const now = new Date();
    const result = validateFieldSaleLocationCapture({
      capture: {
        latitude: 12.9716,
        longitude: 77.5946,
        accuracyMeters: 12,
        capturedAt: now,
        status: "DETECTED",
      },
      settings: DEFAULT_PLATFORM_SETTINGS.fieldForce,
      store: {
        latitude: 12.9716,
        longitude: 77.5946,
        geofenceRadiusMeters: 500,
      },
      req: new Request("https://example.com", {
        headers: {
          "x-forwarded-for": "203.0.113.10",
          "user-agent": "vitest",
        },
      }),
      reference: now,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.evidence.locationStatus).toBe("DETECTED");
      expect(result.evidence.submissionIp).toBe("203.0.113.10");
      expect(result.evidence.outsideApprovedArea).toBe(false);
    }
  });

  it("accepts coarse GPS and stores POOR_ACCURACY status", () => {
    const result = validateFieldSaleLocationCapture({
      capture: {
        latitude: 12.9716,
        longitude: 77.5946,
        accuracyMeters: 120,
        capturedAt: new Date(),
        status: "POOR_ACCURACY",
      },
      settings: DEFAULT_PLATFORM_SETTINGS.fieldForce,
      store: { latitude: null, longitude: null, geofenceRadiusMeters: null },
      req: new Request("https://example.com"),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.evidence.locationStatus).toBe("POOR_ACCURACY");
      expect(result.evidence.submissionLatitude).toBe(12.9716);
      expect(result.evidence.locationAccuracyMeters).toBe(120);
    }
  });

  it("rejects stale capture timestamps", () => {
    const now = new Date();
    const stale = new Date(now.getTime() - 5 * 60 * 1000);
    const result = validateFieldSaleLocationCapture({
      capture: {
        latitude: 12.9716,
        longitude: 77.5946,
        accuracyMeters: 12,
        capturedAt: stale,
        status: "DETECTED",
      },
      settings: DEFAULT_PLATFORM_SETTINGS.fieldForce,
      store: { latitude: null, longitude: null, geofenceRadiusMeters: null },
      req: new Request("https://example.com"),
      reference: now,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("location_stale");
    }
  });

  it("flags outside approved geofence", () => {
    const geofence = computeGeofenceResult(
      { latitude: 13.1, longitude: 77.7 },
      { latitude: 12.9716, longitude: 77.5946, geofenceRadiusMeters: 1000 },
    );
    expect(geofence.outsideApprovedArea).toBe(true);
  });
});

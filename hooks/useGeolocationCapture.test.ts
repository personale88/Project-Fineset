import { describe, expect, it } from "vitest";
import {
  isLocationCaptureSubmittable,
  reevaluateCaptureForAccuracy,
} from "@/hooks/useGeolocationCapture";

const baseCapture = {
  latitude: 12.9716,
  longitude: 77.5946,
  accuracyMeters: 92,
  capturedAt: new Date("2026-07-02T08:00:00.000Z"),
  status: "POOR_ACCURACY" as const,
};

describe("reevaluateCaptureForAccuracy", () => {
  it("promotes a fix to detected when admin raises the accuracy limit", () => {
    const result = reevaluateCaptureForAccuracy(baseCapture, 100);
    expect(result.state).toBe("detected");
    expect(result.capture?.status).toBe("DETECTED");
  });

  it("keeps poor_accuracy when the fix is still outside the new limit", () => {
    const result = reevaluateCaptureForAccuracy(baseCapture, 50);
    expect(result.state).toBe("poor_accuracy");
    expect(result.capture?.status).toBe("POOR_ACCURACY");
  });

  it("allows submit when GPS fix is coarse but coordinates are valid", () => {
    const result = reevaluateCaptureForAccuracy(baseCapture, 50);
    expect(result.state).toBe("poor_accuracy");
    expect(
      isLocationCaptureSubmittable(result, true, false),
    ).toBe(true);
  });
});

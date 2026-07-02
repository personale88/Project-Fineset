"use client";

import { useCallback, useMemo, useState } from "react";
import {
  isSuspiciousCoordinate,
  type FieldSaleLocationCaptureInput,
} from "@/lib/field-force/location-capture";

export type GeolocationCaptureState =
  | "idle"
  | "detecting"
  | "detected"
  | "denied"
  | "unavailable"
  | "poor_accuracy";

export interface GeolocationCaptureResult {
  state: GeolocationCaptureState;
  capture: FieldSaleLocationCaptureInput | null;
  errorMessage: string | null;
}

interface UseGeolocationCaptureOptions {
  maxAccuracyMeters: number;
  timeoutMs?: number;
}

function mapPositionToCapture(
  position: GeolocationPosition,
  maxAccuracyMeters: number,
): GeolocationCaptureResult {
  const accuracyMeters = position.coords.accuracy;
  if (accuracyMeters > maxAccuracyMeters) {
    return {
      state: "poor_accuracy",
      capture: {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracyMeters,
        capturedAt: new Date(position.timestamp),
        status: "POOR_ACCURACY",
      },
      errorMessage: null,
    };
  }

  return {
    state: "detected",
    capture: {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracyMeters,
      capturedAt: new Date(position.timestamp),
      status: "DETECTED",
    },
    errorMessage: null,
  };
}

/** Re-apply the admin accuracy threshold to an existing fix (e.g. after settings change). */
export function reevaluateCaptureForAccuracy(
  capture: FieldSaleLocationCaptureInput,
  maxAccuracyMeters: number,
): GeolocationCaptureResult {
  if (capture.status === "PERMISSION_DENIED") {
    return { state: "denied", capture, errorMessage: null };
  }
  if (capture.status === "UNAVAILABLE") {
    return { state: "unavailable", capture, errorMessage: null };
  }

  if (capture.accuracyMeters > maxAccuracyMeters) {
    return {
      state: "poor_accuracy",
      capture: { ...capture, status: "POOR_ACCURACY" },
      errorMessage: null,
    };
  }

  return {
    state: "detected",
    capture: { ...capture, status: "DETECTED" },
    errorMessage: null,
  };
}

function isGpsFixCapture(capture: FieldSaleLocationCaptureInput): boolean {
  return (
    capture.status === "DETECTED" ||
    capture.status === "POOR_ACCURACY"
  );
}

export function useGeolocationCapture(options: UseGeolocationCaptureOptions) {
  const [rawResult, setRawResult] = useState<GeolocationCaptureResult>({
    state: "idle",
    capture: null,
    errorMessage: null,
  });

  const result = useMemo(() => {
    if (!rawResult.capture || !isGpsFixCapture(rawResult.capture)) {
      return rawResult;
    }

    const next = reevaluateCaptureForAccuracy(
      rawResult.capture,
      options.maxAccuracyMeters,
    );
    if (
      next.state === rawResult.state &&
      next.capture?.status === rawResult.capture.status
    ) {
      return rawResult;
    }
    return next;
  }, [rawResult, options.maxAccuracyMeters]);

  const captureLocation = useCallback(async (): Promise<GeolocationCaptureResult> => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      const unavailable: GeolocationCaptureResult = {
        state: "unavailable",
        capture: {
          latitude: 0,
          longitude: 0,
          accuracyMeters: 9999,
          capturedAt: new Date(),
          status: "UNAVAILABLE",
        },
        errorMessage: null,
      };
      setRawResult(unavailable);
      return unavailable;
    }

    setRawResult({ state: "detecting", capture: null, errorMessage: null });

    return await new Promise<GeolocationCaptureResult>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const next = mapPositionToCapture(position, options.maxAccuracyMeters);
          setRawResult(next);
          resolve(next);
        },
        (error) => {
          const denied = error.code === error.PERMISSION_DENIED;
          const next: GeolocationCaptureResult = {
            state: denied ? "denied" : "unavailable",
            capture: {
              latitude: 0,
              longitude: 0,
              accuracyMeters: 9999,
              capturedAt: new Date(),
              status: denied ? "PERMISSION_DENIED" : "UNAVAILABLE",
            },
            errorMessage: error.message || null,
          };
          setRawResult(next);
          resolve(next);
        },
        {
          enableHighAccuracy: true,
          timeout: options.timeoutMs ?? 20_000,
          maximumAge: 0,
        },
      );
    });
  }, [options.maxAccuracyMeters, options.timeoutMs]);

  return {
    ...result,
    captureLocation,
  };
}

export function isLocationCaptureSubmittable(
  result: GeolocationCaptureResult,
  requireGps: boolean,
  allowWithoutGps: boolean,
  activeExceptionId?: string | null,
): boolean {
  if (activeExceptionId) return true;
  if (!requireGps || allowWithoutGps) return true;
  if (result.state === "denied" || result.state === "unavailable") return false;
  if (!result.capture) return false;
  if (
    result.state !== "detected" &&
    result.state !== "poor_accuracy"
  ) {
    return false;
  }
  return !isSuspiciousCoordinate(
    result.capture.latitude,
    result.capture.longitude,
  );
}

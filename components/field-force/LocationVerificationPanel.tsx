"use client";

import { MapPin, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isSuspiciousCoordinate } from "@/lib/field-force/location-capture";
import { useLocationAddress } from "@/hooks/useLocationAddress";
import type { GeolocationCaptureResult } from "@/hooks/useGeolocationCapture";
import { cn } from "@/lib/utils";

interface LocationVerificationCopy {
  title: string;
  detecting: string;
  detected: string;
  denied: string;
  unavailable: string;
  retry: string;
  accuracyLabel: string;
  capturedAtLabel: string;
  resolvingAddress: string;
  addressUnavailable: string;
  buildingLabel: string;
  streetLabel: string;
  localityLabel: string;
  areaLabel: string;
  districtLabel: string;
  stateLabel: string;
  requiredHint: string;
}

interface LocationVerificationPanelProps {
  copy: LocationVerificationCopy;
  result: GeolocationCaptureResult;
  onRetry: () => void;
  isDetecting: boolean;
  className?: string;
}

function formatAccuracy(meters: number | undefined): string {
  if (meters == null || !Number.isFinite(meters)) return "—";
  return `${Math.round(meters)} m`;
}

function AddressLine({ label, value }: { label: string; value: string | null }) {
  if (!value?.trim()) return null;
  return (
    <p>
      <span className="text-text-muted">{label}: </span>
      <span className="font-medium text-text-primary">{value}</span>
    </p>
  );
}

function hasVisibleAddressLines(
  address: {
    building: string | null;
    street: string | null;
    locality: string | null;
    area: string | null;
    district: string | null;
    state: string | null;
  } | null,
): boolean {
  if (!address) return false;
  return Boolean(
    address.building ||
      address.street ||
      address.locality ||
      address.area ||
      address.district ||
      address.state,
  );
}

export function LocationVerificationPanel({
  copy,
  result,
  onRetry,
  isDetecting,
  className,
}: LocationVerificationPanelProps) {
  const capture = result.capture;
  const hasUsableCoordinates =
    capture != null &&
    (capture.status === "DETECTED" || capture.status === "POOR_ACCURACY") &&
    !isSuspiciousCoordinate(capture.latitude, capture.longitude);

  const { address, isLoading: isResolvingAddress, error: addressError } = useLocationAddress(
    hasUsableCoordinates ? capture!.latitude : null,
    hasUsableCoordinates ? capture!.longitude : null,
  );

  let statusMessage = copy.requiredHint;
  if (result.state === "detecting" || isDetecting) statusMessage = copy.detecting;
  else if (result.state === "detected" || result.state === "poor_accuracy") {
    statusMessage = copy.detected;
  } else if (result.state === "denied") statusMessage = copy.denied;
  else if (result.state === "unavailable") statusMessage = copy.unavailable;

  return (
    <section
      className={cn(
        "rounded-card border border-border bg-surface-secondary/50 p-4",
        className,
      )}
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-brand-gold" aria-hidden />
            <h2 className="text-sm font-semibold text-text-primary">{copy.title}</h2>
          </div>
          <p
            className={cn(
              "text-sm",
              result.state === "detected" || result.state === "poor_accuracy"
                ? "text-status-success"
                : result.state === "denied" || result.state === "unavailable"
                  ? "text-status-error"
                  : "text-text-secondary",
            )}
          >
            {statusMessage}
          </p>
          <p className="text-xs text-text-muted">{copy.requiredHint}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRetry}
          disabled={isDetecting}
        >
          <RefreshCw className={cn("mr-1 h-4 w-4", isDetecting && "animate-spin")} />
          {copy.retry}
        </Button>
      </div>

      {capture && result.state !== "idle" ? (
        <div className="mt-3 space-y-2 text-sm text-text-secondary">
          <p>
            {copy.accuracyLabel}:{" "}
            <span className="font-medium text-text-primary">
              {formatAccuracy(capture.accuracyMeters)}
            </span>
          </p>

          {hasUsableCoordinates ? (
            <div className="space-y-1 rounded-lg border border-border bg-surface-card px-3 py-3">
              {isResolvingAddress ? (
                <p className="text-sm text-text-muted">{copy.resolvingAddress}</p>
              ) : address ? (
                <>
                  {hasVisibleAddressLines(address) ? (
                    <div className="space-y-1">
                      <AddressLine label={copy.buildingLabel} value={address.building} />
                      <AddressLine label={copy.streetLabel} value={address.street} />
                      <AddressLine label={copy.localityLabel} value={address.locality} />
                      <AddressLine label={copy.areaLabel} value={address.area} />
                      <AddressLine label={copy.districtLabel} value={address.district} />
                      <AddressLine label={copy.stateLabel} value={address.state} />
                    </div>
                  ) : (
                    <p className="font-medium text-text-primary">{address.formatted}</p>
                  )}
                </>
              ) : (
                <p className="text-sm text-text-muted">
                  {addressError ?? copy.addressUnavailable}
                </p>
              )}
            </div>
          ) : null}

          <p>
            {copy.capturedAtLabel}:{" "}
            <span className="font-medium text-text-primary">
              {new Date(capture.capturedAt).toLocaleString()}
            </span>
          </p>
        </div>
      ) : null}
    </section>
  );
}

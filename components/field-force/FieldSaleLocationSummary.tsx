import { MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCoordinates } from "@/lib/field-force/location-capture";
import type { FieldSaleListItem } from "@/types";

interface FieldSaleLocationSummaryProps {
  item: Pick<
    FieldSaleListItem,
    | "submissionLatitude"
    | "submissionLongitude"
    | "locationAccuracyMeters"
    | "locationCapturedAt"
    | "locationStatus"
    | "locationAddress"
    | "distanceFromStoreMeters"
    | "outsideApprovedArea"
  >;
}

export function FieldSaleLocationSummary({ item }: FieldSaleLocationSummaryProps) {
  if (!item.locationStatus) return null;

  const hasCoordinates =
    item.submissionLatitude != null && item.submissionLongitude != null;

  return (
    <div className="mt-2 space-y-1 text-xs text-text-muted">
      <div className="flex flex-wrap items-center gap-2">
        <MapPin className="h-3.5 w-3.5" aria-hidden />
        <span>GPS: {item.locationStatus.replaceAll("_", " ").toLowerCase()}</span>
        {item.locationAccuracyMeters != null ? (
          <span>· ±{Math.round(item.locationAccuracyMeters)} m</span>
        ) : null}
        {item.outsideApprovedArea ? (
          <Badge variant="warning">Outside approved area</Badge>
        ) : null}
      </div>
      {item.locationAddress ? (
        <p className="text-text-secondary">{item.locationAddress}</p>
      ) : hasCoordinates ? (
        <p className="font-mono text-text-secondary">
          {formatCoordinates(item.submissionLatitude!, item.submissionLongitude!)}
        </p>
      ) : null}
      {item.locationCapturedAt ? (
        <p>Captured {new Date(item.locationCapturedAt).toLocaleString()}</p>
      ) : null}
    </div>
  );
}

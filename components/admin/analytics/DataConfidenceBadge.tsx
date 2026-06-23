"use client";

/**
 * Displays a colour-coded badge reflecting the statistical confidence of the
 * analytics result based on visit count. Shown inline with the KPI section
 * before the AI narrative loads, so the user understands data quality before
 * reading the analysis.
 *
 * Confidence levels (from data-honesty.ts):
 *   high    → ≥ 50 visits  → Green  "High confidence"
 *   medium  → 10–49 visits → Amber  "Limited data"
 *   low     → < 10 visits  → Red    "Insufficient data"
 *   no_data → 0 visits     → Red    "No data"
 */

import { cn } from "@/lib/utils";
import type { DataConfidence } from "@/lib/analytics/data-honesty";

interface DataConfidenceBadgeProps {
  confidence: DataConfidence;
  totalVisits: number;
  className?: string;
}

const CONFIG: Record<
  DataConfidence,
  { label: string; colorClass: string; dotClass: string }
> = {
  high: {
    label: "High confidence",
    colorClass:
      "bg-status-success/10 text-status-success border-status-success/20",
    dotClass: "bg-status-success",
  },
  medium: {
    label: "Limited data — interpret with caution",
    colorClass:
      "bg-status-warning/10 text-status-warning border-status-warning/20",
    dotClass: "bg-status-warning",
  },
  low: {
    label: "Insufficient data for reliable analysis",
    colorClass:
      "bg-status-error/10 text-status-error border-status-error/20",
    dotClass: "bg-status-error",
  },
  no_data: {
    label: "No data recorded",
    colorClass:
      "bg-status-error/10 text-status-error border-status-error/20",
    dotClass: "bg-status-error",
  },
};

export function DataConfidenceBadge({
  confidence,
  totalVisits,
  className,
}: DataConfidenceBadgeProps) {
  const config = CONFIG[confidence];
  const countLabel =
    confidence === "no_data"
      ? ""
      : ` (${totalVisits.toLocaleString()} ${totalVisits === 1 ? "visit" : "visits"})`;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        config.colorClass,
        className,
      )}
      role="status"
      aria-label={`Data confidence: ${config.label}${countLabel}`}
    >
      <span
        className={cn("h-1.5 w-1.5 shrink-0 rounded-full", config.dotClass)}
        aria-hidden="true"
      />
      {config.label}
      {countLabel}
    </span>
  );
}

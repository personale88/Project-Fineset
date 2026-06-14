import { cn } from "@/lib/utils";
import type { ConfidenceLevel } from "@/lib/import-engine/types";

const LABELS: Record<ConfidenceLevel, string> = {
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "REVIEW",
  UNMAPPED: "REVIEW",
};

const STYLES: Record<ConfidenceLevel, string> = {
  HIGH: "bg-status-success/10 text-status-success border-status-success/30",
  MEDIUM: "bg-status-warning/10 text-status-warning border-status-warning/30",
  LOW: "bg-destructive/10 text-destructive border-destructive/30",
  UNMAPPED: "bg-destructive/10 text-destructive border-destructive/30",
};

interface ConfidenceBadgeProps {
  level: ConfidenceLevel;
  score?: number;
}

export function ConfidenceBadge({ level, score }: ConfidenceBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        STYLES[level],
      )}
    >
      {LABELS[level]}
      {typeof score === "number" && level !== "UNMAPPED" ? ` · ${score}%` : ""}
    </span>
  );
}

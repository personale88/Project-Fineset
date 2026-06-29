"use client";

import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface AutomationDryRunModeBannerProps {
  message: string;
  className?: string;
  testId?: string;
}

export function AutomationDryRunModeBanner({
  message,
  className,
  testId = "automation-dry-run-mode-banner",
}: AutomationDryRunModeBannerProps) {
  return (
    <div
      role="status"
      data-testid={testId}
      className={cn(
        "flex items-start gap-2 rounded-lg border border-status-warning/30 bg-status-warning/5 px-4 py-3",
        className,
      )}
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-status-warning" aria-hidden />
      <p className="text-sm text-text-secondary">{message}</p>
    </div>
  );
}

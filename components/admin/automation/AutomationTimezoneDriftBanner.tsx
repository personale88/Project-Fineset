"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AUTOMATION_MOBILE_FULL_WIDTH_BUTTON_CLASS } from "@/lib/automation/automation-center-layout";
import { cn } from "@/lib/utils";

interface AutomationTimezoneDriftBannerProps {
  message: string;
  syncLabel: string;
  onSync: () => void;
  syncing?: boolean;
  canEdit?: boolean;
  className?: string;
}

export function AutomationTimezoneDriftBanner({
  message,
  syncLabel,
  onSync,
  syncing = false,
  canEdit = true,
  className,
}: AutomationTimezoneDriftBannerProps) {
  return (
    <div
      role="status"
      data-testid="automation-timezone-drift-banner"
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-status-warning/30 bg-status-warning/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-2">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-status-warning" aria-hidden />
        <p className="min-w-0 text-sm text-text-secondary">{message}</p>
      </div>
      {canEdit ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onSync}
          disabled={syncing}
          data-testid="automation-timezone-sync"
          className={cn("shrink-0", AUTOMATION_MOBILE_FULL_WIDTH_BUTTON_CLASS)}
        >
          {syncLabel}
        </Button>
      ) : null}
    </div>
  );
}

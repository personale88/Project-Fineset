"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AdminLoadErrorBannerProps {
  message: string;
  retryLabel?: string;
  onRetry?: () => void;
  retryDisabled?: boolean;
  className?: string;
  "data-testid"?: string;
}

export function AdminLoadErrorBanner({
  message,
  retryLabel = "Try again",
  onRetry,
  retryDisabled = false,
  className,
  "data-testid": testId,
}: AdminLoadErrorBannerProps) {
  return (
    <div
      role="alert"
      data-testid={testId}
      className={cn(
        "flex flex-col gap-3 rounded-card border border-status-error/30 bg-status-error/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-status-error" aria-hidden />
        <p className="text-sm text-status-error">{message}</p>
      </div>
      {onRetry ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRetry}
          disabled={retryDisabled}
          className="shrink-0"
        >
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}

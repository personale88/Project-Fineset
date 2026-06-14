"use client";

import { Loader2 } from "lucide-react";

interface ProgressStepProps {
  processed: number;
  total: number;
  statusLabel: string;
  error?: string | null;
  onViewPartial?: () => void;
}

export function ProgressStep({
  processed,
  total,
  statusLabel,
  error,
  onViewPartial,
}: ProgressStepProps) {
  const percent = total > 0 ? Math.round((processed / total) * 100) : 0;

  return (
    <div className="space-y-4 py-4">
      <div className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-brand-gold" aria-hidden />
        <div>
          <p className="font-medium text-text-primary">Importing your data</p>
          <p className="text-sm text-text-secondary">{statusLabel}</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
          <div
            className="h-full rounded-full bg-brand-gold transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="text-sm text-text-secondary">
          Processed {processed.toLocaleString()} of {total.toLocaleString()} rows
        </p>
      </div>

      {error && (
        <div className="rounded-card border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
          <p className="font-medium text-destructive">{error}</p>
          {onViewPartial && (
            <button
              type="button"
              className="mt-2 text-brand-gold underline"
              onClick={onViewPartial}
            >
              View partial results
            </button>
          )}
        </div>
      )}
    </div>
  );
}

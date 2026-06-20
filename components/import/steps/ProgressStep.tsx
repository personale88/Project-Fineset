"use client";

import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProgressStepProps {
  processed: number;
  total: number;
  statusLabel: string;
  batchIndex?: number;
  batchCount?: number;
  successCount?: number;
  errorCount?: number;
  phase: "importing" | "failed" | "complete";
  error?: string | null;
  onViewPartial?: () => void;
}

export function ProgressStep({
  processed,
  total,
  statusLabel,
  batchIndex = 0,
  batchCount = 0,
  successCount = 0,
  errorCount = 0,
  phase,
  error,
  onViewPartial,
}: ProgressStepProps) {
  const percent = total > 0 ? Math.round((processed / total) * 100) : 0;
  const showBatchMeta = batchCount > 1 && batchIndex > 0;

  return (
    <div className="space-y-4 py-4">
      <div className="flex items-start gap-3">
        {phase === "importing" ? (
          <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-brand-gold" aria-hidden />
        ) : phase === "complete" ? (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-gold" aria-hidden />
        ) : (
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden />
        )}
        <div className="min-w-0">
          <p className="font-medium text-text-primary">
            {phase === "failed"
              ? "Import stopped"
              : phase === "complete"
                ? "Import finished"
                : "Importing your data"}
          </p>
          <p className="text-sm text-text-secondary">{statusLabel}</p>
          {showBatchMeta ? (
            <p className="mt-1 text-xs text-text-muted">
              Batch {batchIndex} of {batchCount}
              {phase === "importing" ? " · keep this tab open" : null}
            </p>
          ) : phase === "importing" ? (
            <p className="mt-1 text-xs text-text-muted">Keep this tab open until the import finishes.</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
          <div
            className={`h-full rounded-full transition-all ${
              phase === "failed" ? "bg-destructive/70" : "bg-brand-gold"
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-text-secondary">
          <span>
            {processed.toLocaleString()} of {total.toLocaleString()} rows processed
          </span>
          {(successCount > 0 || errorCount > 0) && (
            <span className="text-xs text-text-muted">
              {successCount.toLocaleString()} saved
              {errorCount > 0 ? ` · ${errorCount.toLocaleString()} failed` : ""}
            </span>
          )}
        </div>
      </div>

      {error ? (
        <div className="rounded-card border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
          <p className="font-medium text-destructive">{error}</p>
          {onViewPartial ? (
            <Button type="button" variant="link" className="mt-2 h-auto p-0" onClick={onViewPartial}>
              View partial results
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

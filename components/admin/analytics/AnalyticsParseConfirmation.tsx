"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnalyticsTokenEstimate } from "@/components/admin/analytics/AnalyticsTokenEstimate";
import type { AnalyticsAskConfirmationPreview } from "@/types/admin-business-analytics-ask";
import type { Content } from "@/content/en";

type ConfirmationCopy = Content["admin"]["analytics"]["ask"]["confirmation"];

interface AnalyticsParseConfirmationProps {
  copy: ConfirmationCopy;
  tokenCopy: Content["admin"]["analytics"]["ask"]["tokenUsage"];
  preview: AnalyticsAskConfirmationPreview;
  prompt: string;
  isPending: boolean;
  onConfirm: () => void;
  onEdit: () => void;
}

export function AnalyticsParseConfirmation({
  copy,
  tokenCopy,
  preview,
  prompt,
  isPending,
  onConfirm,
  onEdit,
}: AnalyticsParseConfirmationProps) {
  return (
    <div className="rounded-card border border-status-warning/40 bg-status-warning/5 p-4 shadow-sm">
      <div className="flex gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-status-warning" aria-hidden />
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className="font-medium text-text-primary">{copy.title}</p>
            <p className="mt-1 text-sm text-text-secondary">{preview.message}</p>
          </div>

          <div className="rounded-lg border border-border bg-surface-card px-3 py-2.5 text-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
              {copy.interpretedLabel}
            </p>
            <p className="mt-1 text-text-primary">{preview.interpretedQuery}</p>
            <p className="mt-2 text-xs text-text-muted">
              {copy.parseSource}:{" "}
              <span className="font-medium text-text-secondary">
                {preview.parseSource === "gemini" ? copy.sourceGemini : copy.sourceRules}
              </span>
              {" · "}
              {copy.confidence}:{" "}
              <span className="font-medium text-text-secondary">{preview.parseConfidence}</span>
            </p>
          </div>

          <AnalyticsTokenEstimate
            copy={tokenCopy}
            prompt={prompt}
            geminiConfigured={preview.geminiConfigured}
            usage={preview.tokenUsage}
          />

          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" disabled={isPending} onClick={onConfirm}>
              {copy.confirmButton}
            </Button>
            <Button type="button" size="sm" variant="secondary" disabled={isPending} onClick={onEdit}>
              {copy.editButton}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

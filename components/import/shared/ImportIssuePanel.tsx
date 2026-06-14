"use client";

import type { ImportIssueSummary } from "@/lib/import-engine/types";
import { cn } from "@/lib/utils";

interface ImportIssuePanelProps {
  title: string;
  description: string;
  issues: ImportIssueSummary[];
  emptyMessage: string;
  variant: "error" | "warning";
  labels: {
    howToFix: string;
    willNotImport: string;
    willImport: string;
    rowCount: string;
  };
}

function IssueRow({
  issue,
  variant,
  labels,
}: {
  issue: ImportIssueSummary;
  variant: "error" | "warning";
  labels: ImportIssuePanelProps["labels"];
}) {
  return (
    <li className="rounded-card border border-border bg-surface-card px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-text-primary">
            {issue.column}: {issue.message}
          </p>
          <p className="mt-1 text-xs text-text-muted">
            {labels.rowCount.replace("{count}", issue.count.toLocaleString())}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide",
            variant === "error"
              ? "bg-destructive/10 text-destructive"
              : "bg-status-warning/10 text-status-warning",
          )}
        >
          {issue.willImport ? labels.willImport : labels.willNotImport}
        </span>
      </div>
      <div className="mt-3 rounded-md bg-surface-muted/50 px-3 py-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">
          {labels.howToFix}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-text-secondary">{issue.fixHint}</p>
      </div>
    </li>
  );
}

export function ImportIssuePanel({
  title,
  description,
  issues,
  emptyMessage,
  variant,
  labels,
}: ImportIssuePanelProps) {
  const borderClass =
    variant === "error" ? "border-destructive/30 bg-destructive/5" : "border-status-warning/30 bg-status-warning/5";
  const titleClass = variant === "error" ? "text-destructive" : "text-status-warning";

  return (
    <details className={cn("rounded-card border px-4 py-3", borderClass)} open={issues.length > 0}>
      <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className={cn("font-medium", titleClass)}>{title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-text-secondary">{description}</p>
          </div>
        </div>
      </summary>

      {issues.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {issues.map((issue) => (
            <IssueRow key={issue.id} issue={issue} variant={variant} labels={labels} />
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-text-secondary">{emptyMessage}</p>
      )}
    </details>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  hint?: string;
  tone?: "default" | "error" | "warning" | "success";
}

export function ImportStatCard({ label, value, hint, tone = "default" }: StatCardProps) {
  const toneClass =
    tone === "error"
      ? "border-destructive/30"
      : tone === "warning"
        ? "border-status-warning/30"
        : tone === "success"
          ? "border-status-success/30"
          : "border-border";

  return (
    <div className={cn("rounded-card border bg-surface-card p-4", toneClass)}>
      <p className="text-xs uppercase tracking-wide text-text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold text-text-primary">
        {value.toLocaleString()}
      </p>
      {hint && <p className="mt-1 text-xs text-text-muted">{hint}</p>}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { content } from "@/content/en";
import { ImportAutoFixPanel } from "@/components/import/shared/ImportAutoFixPanel";
import { ImportIssuePanel, ImportStatCard } from "@/components/import/shared/ImportIssuePanel";
import type { ImportPreview, ImportTransformOptions } from "@/lib/import-engine/types";

interface ConfirmationStepProps {
  preview: ImportPreview;
  importRowCount: number;
  transformOptions: ImportTransformOptions;
  onTransformOptionsChange: (options: ImportTransformOptions) => void;
  isRefreshing?: boolean;
  onConfirm: () => void;
  onBack: () => void;
  isSubmitting?: boolean;
}

export function ConfirmationStep({
  preview,
  importRowCount,
  transformOptions,
  onTransformOptionsChange,
  isRefreshing = false,
  onConfirm,
  onBack,
  isSubmitting = false,
}: ConfirmationStepProps) {
  const copy = content.import.confirm;
  const [confirmed, setConfirmed] = useState(false);
  const blocked = preview.missingRequiredColumns.length > 0;

  const issueLabels = {
    howToFix: copy.howToFix,
    willNotImport: copy.willNotImport,
    willImport: copy.willImport,
    rowCount: copy.rowCount,
  };

  return (
    <div className="space-y-5">
      <div className="rounded-card border border-border bg-surface-muted/30 px-4 py-3">
        <h3 className="font-medium text-text-primary">{copy.severityTitle}</h3>
        <p className="mt-1 text-sm leading-relaxed text-text-secondary">{copy.severityIntro}</p>
        <p className="mt-3 text-sm text-text-secondary">
          {copy.importCountNote.replace("{count}", importRowCount.toLocaleString())}
        </p>
      </div>

      <ImportAutoFixPanel
        options={transformOptions}
        onChange={onTransformOptionsChange}
        isRefreshing={isRefreshing}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <ImportStatCard label="Total rows" value={preview.totalRows} />
        <ImportStatCard
          label="Valid rows"
          value={preview.validRows}
          hint={copy.statValidHint}
          tone="success"
        />
        <ImportStatCard
          label="Error rows"
          value={preview.errorRows}
          hint={copy.statErrorHint}
          tone="error"
        />
        <ImportStatCard
          label="Warning rows"
          value={preview.warningRows}
          hint={copy.statWarningHint}
          tone="warning"
        />
        <ImportStatCard label="New customers" value={preview.newCustomers} />
        <ImportStatCard label="Repeat customers" value={preview.repeatCustomers} />
        <ImportStatCard label="Ambiguous" value={preview.ambiguousCustomers} />
        <ImportStatCard label="Skipped" value={preview.skippedRows} />
      </div>

      <ImportIssuePanel
        title={copy.errorSeverityTitle}
        description={copy.errorSeverityBody.replace("{count}", preview.errorRows.toLocaleString())}
        issues={preview.errorSummaries}
        emptyMessage={copy.noBlockingIssues}
        variant="error"
        labels={issueLabels}
      />

      <ImportIssuePanel
        title={copy.warningSeverityTitle}
        description={copy.warningSeverityBody.replace(
          "{count}",
          preview.warningRows.toLocaleString(),
        )}
        issues={preview.warningSummaries}
        emptyMessage={copy.noReviewIssues}
        variant="warning"
        labels={issueLabels}
      />

      <div className="rounded-card border border-border">
        <div className="border-b border-border px-4 py-3">
          <h3 className="font-medium text-text-primary">Column mapping summary</h3>
        </div>
        <div className="divide-y divide-border">
          {preview.columnMappings
            .filter((mapping) => mapping.matchedColumn)
            .map((mapping) => (
              <div
                key={mapping.uploadedHeader}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
              >
                <span className="text-text-secondary">{mapping.uploadedHeader}</span>
                <span className="text-text-primary">
                  → {mapping.matchedColumn?.frontendLabel}{" "}
                  <span className="text-text-muted">
                    ({mapping.isManualOverride ? "manual" : "auto"})
                  </span>
                </span>
              </div>
            ))}
        </div>
      </div>

      {preview.ambiguousCustomers > 0 && (
        <div className="rounded-card border border-status-warning/30 bg-status-warning/5 px-4 py-3 text-sm text-status-warning">
          {preview.ambiguousCustomers} row(s) have conflicting phone/email matches and will be
          skipped.
        </div>
      )}

      {blocked && (
        <div className="rounded-card border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Required columns are still missing. Go back to mapping to fix them.
        </div>
      )}

      <div className="flex items-start gap-3 rounded-card border border-border px-4 py-3">
        <input
          id="import-confirm"
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-border"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
          disabled={blocked || isRefreshing}
        />
        <Label htmlFor="import-confirm" className="text-sm leading-relaxed">
          I have reviewed the mapping and want to import {importRowCount.toLocaleString()} row(s)
          {preview.errorRows > 0
            ? ` (${preview.errorRows.toLocaleString()} error row(s) will be skipped)`
            : ""}
          {preview.warningRows > 0
            ? ` (${preview.warningRows.toLocaleString()} with warnings)`
            : ""}
        </Label>
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="ghost" onClick={onBack} disabled={isRefreshing}>
          Go back
        </Button>
        <Button
          type="button"
          className="ml-auto"
          disabled={!confirmed || blocked || isSubmitting || isRefreshing}
          onClick={onConfirm}
        >
          {isSubmitting ? "Starting import…" : "Start import"}
        </Button>
      </div>
    </div>
  );
}

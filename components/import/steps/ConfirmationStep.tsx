"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { ImportPreview } from "@/lib/import-engine/types";

interface ConfirmationStepProps {
  preview: ImportPreview;
  importRowCount: number;
  onConfirm: () => void;
  onBack: () => void;
  isSubmitting?: boolean;
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-card border border-border bg-surface-card p-4">
      <p className="text-xs uppercase tracking-wide text-text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold text-text-primary">{value}</p>
    </div>
  );
}

export function ConfirmationStep({
  preview,
  importRowCount,
  onConfirm,
  onBack,
  isSubmitting = false,
}: ConfirmationStepProps) {
  const [confirmed, setConfirmed] = useState(false);
  const blocked = preview.missingRequiredColumns.length > 0;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard label="Total rows" value={preview.totalRows} />
        <StatCard label="Valid rows" value={preview.validRows} />
        <StatCard label="Error rows" value={preview.errorRows} />
        <StatCard label="Warning rows" value={preview.warningRows} />
        <StatCard label="New customers" value={preview.newCustomers} />
        <StatCard label="Repeat customers" value={preview.repeatCustomers} />
        <StatCard label="Ambiguous" value={preview.ambiguousCustomers} />
        <StatCard label="Skipped" value={preview.skippedRows} />
      </div>

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

      {preview.sampleErrors.length > 0 && (
        <details className="rounded-card border border-border px-4 py-3">
          <summary className="cursor-pointer font-medium text-text-primary">
            Preview errors ({preview.errorRows})
          </summary>
          <ul className="mt-3 space-y-2 text-sm text-text-secondary">
            {preview.sampleErrors.map((error, index) => (
              <li key={`${error.code}-${index}`}>
                {error.column}: {error.message}
              </li>
            ))}
          </ul>
        </details>
      )}

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
          disabled={blocked}
        />
        <Label htmlFor="import-confirm" className="text-sm leading-relaxed">
          I have reviewed the mapping and want to import {importRowCount} row(s)
        </Label>
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="ghost" onClick={onBack}>
          Go back
        </Button>
        <Button
          type="button"
          className="ml-auto"
          disabled={!confirmed || blocked || isSubmitting}
          onClick={onConfirm}
        >
          {isSubmitting ? "Starting import…" : "Start import"}
        </Button>
      </div>
    </div>
  );
}

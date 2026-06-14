"use client";

import { Button } from "@/components/ui/button";
import type { ImportResult, TransformedRow } from "@/lib/import-engine/types";
import { downloadErrorReport } from "@/lib/import-engine/utils/template";

interface SummaryStepProps {
  result: ImportResult;
  transformedRows: TransformedRow[];
  onComplete: () => void;
  onImportAnother: () => void;
}

export function SummaryStep({
  result,
  transformedRows,
  onComplete,
  onImportAnother,
}: SummaryStepProps) {
  const durationSeconds = (result.durationMs / 1000).toFixed(1);

  function handleDownloadErrors() {
    const rows = transformedRows.flatMap((row) =>
      row.errors.map((error) => ({
        rowNumber: row.originalIndex + 2,
        rawData: JSON.stringify(row.rawData),
        code: error.code,
        message: error.message,
      })),
    );
    downloadErrorReport(rows, `import-errors-${result.batchId}.csv`);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-card border border-border bg-surface-card p-4">
        <h3 className="font-display text-xl font-semibold text-text-primary">Import complete</h3>
        <p className="mt-2 text-sm text-text-secondary">
          {result.successCount.toLocaleString()} row(s) imported ·{" "}
          {result.newCustomersCreated.toLocaleString()} new customers ·{" "}
          {result.repeatCustomersUpdated.toLocaleString()} repeat customers
        </p>
        <p className="mt-1 text-xs text-text-muted">Completed in {durationSeconds}s</p>
      </div>

      {result.errorCount > 0 && (
        <Button type="button" variant="outline" onClick={handleDownloadErrors}>
          Download error report
        </Button>
      )}

      <p className="text-sm text-text-muted">
        You can undo this import within 24 hours from Import History.
      </p>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={onComplete}>
          View imported records
        </Button>
        <Button type="button" variant="outline" onClick={onImportAnother}>
          Import another file
        </Button>
      </div>
    </div>
  );
}

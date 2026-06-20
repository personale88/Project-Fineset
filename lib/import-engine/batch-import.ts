import { IMPORT_CONFIG } from "@/lib/import-engine/config";
import type { ImportResult, TransformedRow } from "@/lib/import-engine/types";

export function chunkImportRows<T>(rows: T[], size = IMPORT_CONFIG.requestBatchSize): T[][] {
  if (rows.length === 0) return [];
  const chunks: T[][] = [];
  for (let offset = 0; offset < rows.length; offset += size) {
    chunks.push(rows.slice(offset, offset + size));
  }
  return chunks;
}

export function emptyImportResult(batchId: string): ImportResult {
  return {
    batchId,
    totalProcessed: 0,
    successCount: 0,
    errorCount: 0,
    newCustomersCreated: 0,
    repeatCustomersUpdated: 0,
    errors: [],
    durationMs: 0,
  };
}

export function mergeImportResults(base: ImportResult, chunk: ImportResult): ImportResult {
  return {
    batchId: base.batchId,
    totalProcessed: base.totalProcessed + chunk.totalProcessed,
    successCount: base.successCount + chunk.successCount,
    errorCount: base.errorCount + chunk.errorCount,
    newCustomersCreated: base.newCustomersCreated + chunk.newCustomersCreated,
    repeatCustomersUpdated: base.repeatCustomersUpdated + chunk.repeatCustomersUpdated,
    errors: [...base.errors, ...chunk.errors],
    durationMs: base.durationMs + chunk.durationMs,
  };
}

export type ImportProgressUpdate = {
  processed: number;
  total: number;
  batchIndex: number;
  batchCount: number;
  successCount: number;
  errorCount: number;
  statusLabel: string;
};

export function buildImportProgressLabel(
  update: Pick<ImportProgressUpdate, "processed" | "total" | "batchIndex" | "batchCount" | "successCount" | "errorCount">,
  phase: "sending" | "saved",
): string {
  if (phase === "sending") {
    return `Sending batch ${update.batchIndex} of ${update.batchCount}…`;
  }

  if (update.errorCount > 0) {
    return `${update.successCount.toLocaleString()} imported · ${update.errorCount.toLocaleString()} failed so far`;
  }

  return `${update.processed.toLocaleString()} of ${update.total.toLocaleString()} rows saved`;
}

export function batchCountForRows(rowCount: number, size = IMPORT_CONFIG.requestBatchSize): number {
  if (rowCount <= 0) return 0;
  return Math.ceil(rowCount / size);
}

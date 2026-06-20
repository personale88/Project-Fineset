import { apiFetch } from "@/lib/api/client";
import {
  buildImportProgressLabel,
  chunkImportRows,
  emptyImportResult,
  mergeImportResults,
  type ImportProgressUpdate,
} from "@/lib/import-engine/batch-import";
import type {
  DedupeResult,
  ImportHistoryRecord,
  ImportPayload,
  ImportResult,
} from "@/lib/import-engine/types";
import { ApiError } from "@/types";

export type { ImportProgressUpdate };

export type ExecuteImportPayload = ImportPayload & {
  storeId: string;
  fileName?: string;
  finalize?: boolean;
  totalRows?: number;
  cumulativeStats?: {
    totalProcessed: number;
    successCount: number;
    errorCount: number;
    newCustomersCreated: number;
    repeatCustomersUpdated: number;
  };
};

export function formatImportError(error: unknown): string {
  if (error instanceof ImportBatchError) {
    return error.message;
  }
  if (error instanceof ApiError) {
    if (error.status === 413) {
      return "Import batch was too large for the server. The import now runs in smaller batches — please try again.";
    }
    return error.body.message || error.message;
  }
  if (error instanceof Error) return error.message;
  return "Import failed";
}

export class ImportBatchError extends Error {
  partialResult: ImportResult | null;

  constructor(message: string, partialResult: ImportResult | null) {
    super(message);
    this.name = "ImportBatchError";
    this.partialResult = partialResult;
  }
}

export async function dedupeImportRows(body: {
  featureKey: string;
  storeId: string;
  rows: Array<{ rowIndex: number; phone?: string | null; email?: string | null }>;
}): Promise<{ results: DedupeResult[] }> {
  return apiFetch("/api/import/dedupe", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function executeImport(payload: ExecuteImportPayload): Promise<ImportResult> {
  return apiFetch("/api/import/execute", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function executeImportInBatches(
  payload: ExecuteImportPayload,
  onProgress?: (update: ImportProgressUpdate) => void,
): Promise<ImportResult> {
  const batches = chunkImportRows(payload.rows);
  const batchCount = batches.length;
  const total = payload.rows.length;
  let cumulative = emptyImportResult(payload.batchId);
  let processedBefore = 0;

  for (let index = 0; index < batches.length; index += 1) {
    const batchIndex = index + 1;
    const isLast = batchIndex === batchCount;
    const batchRows = batches[index];

    onProgress?.({
      processed: processedBefore,
      total,
      batchIndex,
      batchCount,
      successCount: cumulative.successCount,
      errorCount: cumulative.errorCount,
      statusLabel: buildImportProgressLabel(
        {
          processed: processedBefore,
          total,
          batchIndex,
          batchCount,
          successCount: cumulative.successCount,
          errorCount: cumulative.errorCount,
        },
        "sending",
      ),
    });

    try {
      const chunkResult = await executeImport({
        ...payload,
        rows: batchRows,
        finalize: isLast,
        totalRows: isLast ? total : undefined,
        cumulativeStats: isLast
          ? {
              totalProcessed: cumulative.totalProcessed,
              successCount: cumulative.successCount,
              errorCount: cumulative.errorCount,
              newCustomersCreated: cumulative.newCustomersCreated,
              repeatCustomersUpdated: cumulative.repeatCustomersUpdated,
            }
          : undefined,
      });

      cumulative = mergeImportResults(cumulative, chunkResult);
    } catch (error) {
      throw new ImportBatchError(
        formatImportError(error),
        cumulative.totalProcessed > 0 ? cumulative : null,
      );
    }

    processedBefore += batchRows.length;
    const processed = Math.min(processedBefore, total);

    onProgress?.({
      processed,
      total,
      batchIndex,
      batchCount,
      successCount: cumulative.successCount,
      errorCount: cumulative.errorCount,
      statusLabel: buildImportProgressLabel(
        {
          processed,
          total,
          batchIndex,
          batchCount,
          successCount: cumulative.successCount,
          errorCount: cumulative.errorCount,
        },
        "saved",
      ),
    });
  }

  return cumulative;
}

export async function rollbackImportBatch(batchId: string): Promise<{
  deletedVisitLogs: number;
  deletedCallLogs: number;
  deletedCustomers: number;
}> {
  return apiFetch("/api/import/rollback", {
    method: "POST",
    body: JSON.stringify({ batchId }),
  });
}

export async function getImportHistory(params: {
  storeId: string;
  featureKey?: string;
}): Promise<{ data: ImportHistoryRecord[] }> {
  const qs = new URLSearchParams({ storeId: params.storeId });
  if (params.featureKey) qs.set("featureKey", params.featureKey);
  return apiFetch(`/api/import/history?${qs.toString()}`);
}

import { apiFetch } from "@/lib/api/client";
import type {
  DedupeResult,
  ImportHistoryRecord,
  ImportPayload,
  ImportResult,
} from "@/lib/import-engine/types";

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

export async function executeImport(
  payload: ImportPayload & { storeId: string; fileName?: string },
): Promise<ImportResult> {
  return apiFetch("/api/import/execute", {
    method: "POST",
    body: JSON.stringify(payload),
  });
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

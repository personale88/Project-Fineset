"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { getImportHistory, rollbackImportBatch } from "@/lib/api/import";
import type { ImportHistoryRecord } from "@/lib/import-engine/types";
import { SCHEMA_CONFIGS } from "@/lib/import-engine/schema-configs";

interface ImportHistoryPanelProps {
  storeId: string;
  featureKey?: string;
}

export function ImportHistoryPanel({ storeId, featureKey }: ImportHistoryPanelProps) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["import-history", storeId, featureKey],
    queryFn: () => getImportHistory({ storeId, featureKey }),
  });

  async function handleRollback(record: ImportHistoryRecord) {
    if (!window.confirm(`Undo import of "${record.fileName || record.batchId}"?`)) return;
    await rollbackImportBatch(record.batchId);
    await queryClient.invalidateQueries({ queryKey: ["import-history", storeId] });
  }

  if (isLoading) {
    return <p className="text-sm text-text-secondary">Loading import history…</p>;
  }

  const records = data?.data ?? [];
  if (records.length === 0) {
    return <p className="text-sm text-text-secondary">No imports yet for this store.</p>;
  }

  return (
    <div className="space-y-3">
      {records.map((record) => {
        const featureLabel =
          SCHEMA_CONFIGS[record.featureKey]?.featureLabel ?? record.featureKey;
        return (
          <article
            key={record.id}
            className="rounded-card border border-border bg-surface-card p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium text-text-primary">
                  {record.fileName || "Imported file"}
                </p>
                <p className="text-sm text-text-secondary">
                  {featureLabel} · {new Date(record.importedAt).toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  {record.successCount} imported · {record.errorCount} errors ·{" "}
                  {record.newCustomers} new · {record.repeatCustomers} repeat
                </p>
              </div>
              {record.canRollback && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void handleRollback(record)}
                >
                  Rollback
                </Button>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}

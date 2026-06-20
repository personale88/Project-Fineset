"use client";

import { useId, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardCollapsibleSection } from "@/components/shared/DashboardCollapsibleSection";
import { getImportHistory, rollbackImportBatch } from "@/lib/api/import";
import { invalidatePortalData } from "@/lib/sync/invalidate-portal-data";
import type { ImportHistoryRecord } from "@/lib/import-engine/types";
import { SCHEMA_CONFIGS } from "@/lib/import-engine/schema-configs";
import { cn } from "@/lib/utils";

interface ImportHistoryPanelProps {
  storeId: string;
  featureKey?: string;
  title?: string;
}

interface ImportHistoryAccordionItemProps {
  record: ImportHistoryRecord;
  isOpen: boolean;
  onToggle: () => void;
  onRollback: (record: ImportHistoryRecord) => void;
}

function ImportHistoryAccordionItem({
  record,
  isOpen,
  onToggle,
  onRollback,
}: ImportHistoryAccordionItemProps) {
  const panelId = useId();
  const triggerId = `${panelId}-trigger`;
  const featureLabel =
    SCHEMA_CONFIGS[record.featureKey]?.featureLabel ?? record.featureKey;
  const importedAt = new Date(record.importedAt).toLocaleString();

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        id={triggerId}
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={onToggle}
        className={cn(
          "flex w-full items-start justify-between gap-3 px-4 py-3 text-left sm:px-6",
          "transition-colors hover:bg-surface-secondary/40",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-card",
        )}
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium text-text-primary">
            {record.fileName || "Imported file"}
          </span>
          <span className="mt-1 block text-sm text-text-secondary">
            {importedAt} · {record.successCount} imported
            {record.errorCount > 0 ? ` · ${record.errorCount} errors` : ""}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "mt-0.5 size-4 shrink-0 text-text-muted transition-transform duration-200",
            isOpen && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>
      {isOpen ? (
        <div
          id={panelId}
          role="region"
          aria-labelledby={triggerId}
          className="space-y-3 border-t border-border bg-surface-secondary/20 px-4 py-3 sm:px-6"
        >
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-text-muted">Import type</dt>
              <dd className="font-medium text-text-primary">{featureLabel}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Total rows</dt>
              <dd className="font-medium text-text-primary">{record.totalRows}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Imported</dt>
              <dd className="font-medium text-text-primary">{record.successCount}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Errors</dt>
              <dd className="font-medium text-text-primary">{record.errorCount}</dd>
            </div>
            <div>
              <dt className="text-text-muted">New customers</dt>
              <dd className="font-medium text-text-primary">{record.newCustomers}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Repeat customers</dt>
              <dd className="font-medium text-text-primary">{record.repeatCustomers}</dd>
            </div>
          </dl>
          <p className="text-xs text-text-muted">Batch ID: {record.batchId}</p>
          {record.canRollback ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(event) => {
                event.stopPropagation();
                onRollback(record);
              }}
            >
              Rollback
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function ImportHistoryPanel({
  storeId,
  featureKey,
  title = "Import history",
}: ImportHistoryPanelProps) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["import-history", storeId, featureKey],
    queryFn: () => getImportHistory({ storeId, featureKey }),
  });
  const [openRecordId, setOpenRecordId] = useState<string | null | undefined>(undefined);

  const records = data?.data ?? [];
  const activeOpenId =
    openRecordId === undefined ? (records[0]?.id ?? null) : openRecordId;

  async function handleRollback(record: ImportHistoryRecord) {
    if (!window.confirm(`Undo import of "${record.fileName || record.batchId}"?`)) return;
    await rollbackImportBatch(record.batchId);
    await queryClient.invalidateQueries({ queryKey: ["import-history", storeId] });
    void invalidatePortalData(queryClient);
    setOpenRecordId(undefined);
  }

  const subtitle = isLoading
    ? "Loading…"
    : records.length === 0
      ? "No imports yet for this store"
      : `${records.length} import${records.length === 1 ? "" : "s"}`;

  return (
    <DashboardCollapsibleSection title={title} subtitle={subtitle}>
      {isLoading ? (
        <p className="text-sm text-text-secondary">Loading import history…</p>
      ) : records.length === 0 ? (
        <p className="text-sm text-text-secondary">Imports will appear here after you upload a spreadsheet.</p>
      ) : (
        <div className="-mx-4 -mb-4 overflow-hidden rounded-b-card sm:-mx-6 sm:-mb-6">
          {records.map((record) => (
            <ImportHistoryAccordionItem
              key={record.id}
              record={record}
              isOpen={activeOpenId === record.id}
              onToggle={() =>
                setOpenRecordId((current) => {
                  const resolved =
                    current === undefined ? (records[0]?.id ?? null) : current;
                  return resolved === record.id ? null : record.id;
                })
              }
              onRollback={(item) => void handleRollback(item)}
            />
          ))}
        </div>
      )}
    </DashboardCollapsibleSection>
  );
}

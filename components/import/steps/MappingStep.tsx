"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { content } from "@/content/en";
import type { ColumnConfig, ColumnMappingResult, FeatureSchemaConfig } from "@/lib/import-engine/types";
import {
  applyManualMapping,
  missingRequiredColumns,
  resetMappingsToAuto,
} from "@/lib/import-engine/core/columnMatcher";
import {
  ColumnMappingRow,
  MappingTableHeader,
} from "@/components/import/shared/ColumnMappingRow";

interface MappingStepProps {
  schema: FeatureSchemaConfig;
  mappings: ColumnMappingResult[];
  onMappingsChange: (mappings: ColumnMappingResult[]) => void;
  uploadedHeaders: string[];
  rows: Record<string, string>[];
  onContinue: () => void;
  onBack: () => void;
  isSubmitting?: boolean;
}

export function MappingStep({
  schema,
  mappings,
  onMappingsChange,
  uploadedHeaders,
  rows,
  onContinue,
  onBack,
  isSubmitting = false,
}: MappingStepProps) {
  const copy = content.import.mapping;
  const missingRequired = missingRequiredColumns(mappings, schema);
  const autoMapped = mappings.filter(
    (mapping) => mapping.matchedColumn && !mapping.isManualOverride,
  ).length;
  const needsReview = mappings.filter(
    (mapping) =>
      mapping.confidenceLevel === "MEDIUM" ||
      mapping.confidenceLevel === "LOW" ||
      mapping.confidenceLevel === "UNMAPPED",
  ).length;

  function handleMappingChange(header: string, column: ColumnConfig | null) {
    onMappingsChange(applyManualMapping(mappings, header, column));
  }

  return (
    <div className="flex min-h-0 flex-col gap-4">
      <div className="shrink-0 space-y-2 rounded-card border border-border bg-surface-muted/40 px-4 py-3">
        <p className="text-sm text-text-secondary">
          {copy.summary
            .replace("{autoMapped}", String(autoMapped))
            .replace("{total}", String(mappings.length))
            .replace("{needsReview}", String(needsReview))}
        </p>
        <p className="text-xs text-text-muted">{copy.tableHint}</p>
      </div>

      <div className="min-h-0 overflow-hidden rounded-card border border-border">
        <div className="max-h-[min(52vh,28rem)] overflow-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <MappingTableHeader copy={copy.columns} />
            <tbody>
              {mappings.map((mapping) => (
                <ColumnMappingRow
                  key={mapping.uploadedHeader}
                  mapping={mapping}
                  schemaColumns={schema.columns}
                  onChange={handleMappingChange}
                  copy={copy}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {missingRequired.length > 0 && (
        <div className="shrink-0 rounded-card border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <p className="font-medium">Missing required columns</p>
          <ul className="mt-2 list-disc pl-5">
            {missingRequired.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
        </div>
      )}

      {missingRequired.length === 0 && schema.featureKey === "call_log" ? (
        <p className="shrink-0 text-xs text-text-muted">{copy.callLogDefaults}</p>
      ) : null}

      <div className="sticky bottom-0 flex shrink-0 flex-wrap gap-2 border-t border-border bg-surface-card pt-4">
        <Button
          type="button"
          variant="outline"
          disabled={isSubmitting}
          onClick={() =>
            onMappingsChange(resetMappingsToAuto(uploadedHeaders, schema, rows))
          }
        >
          Reset to auto-map
        </Button>
        <Button type="button" variant="ghost" disabled={isSubmitting} onClick={onBack}>
          Back
        </Button>
        <Button
          type="button"
          className="ml-auto gap-2"
          disabled={missingRequired.length > 0 || isSubmitting}
          onClick={onContinue}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Preparing preview…
            </>
          ) : (
            "Continue"
          )}
        </Button>
      </div>
    </div>
  );
}

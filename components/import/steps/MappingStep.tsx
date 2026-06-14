"use client";

import { Button } from "@/components/ui/button";
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
}

export function MappingStep({
  schema,
  mappings,
  onMappingsChange,
  uploadedHeaders,
  rows,
  onContinue,
  onBack,
}: MappingStepProps) {
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
    <div className="space-y-4">
      <div className="rounded-card border border-border bg-surface-muted/40 px-4 py-3 text-sm text-text-secondary">
        {autoMapped} of {mappings.length} columns mapped automatically · {needsReview} need review
      </div>

      <div className="overflow-x-auto rounded-card border border-border">
        <table className="min-w-full">
          <MappingTableHeader />
          <tbody>
            {mappings.map((mapping) => (
              <ColumnMappingRow
                key={mapping.uploadedHeader}
                mapping={mapping}
                schemaColumns={schema.columns}
                onChange={handleMappingChange}
              />
            ))}
          </tbody>
        </table>
      </div>

      {missingRequired.length > 0 && (
        <div className="rounded-card border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <p className="font-medium">Missing required columns</p>
          <ul className="mt-2 list-disc pl-5">
            {missingRequired.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            onMappingsChange(resetMappingsToAuto(uploadedHeaders, schema, rows))
          }
        >
          Reset to auto-map
        </Button>
        <Button type="button" variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button
          type="button"
          className="ml-auto"
          disabled={missingRequired.length > 0}
          onClick={onContinue}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}

"use client";

import { cn } from "@/lib/utils";
import type { ColumnConfig, ColumnMappingResult } from "@/lib/import-engine/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfidenceBadge } from "./ConfidenceBadge";

interface ColumnMappingRowProps {
  mapping: ColumnMappingResult;
  schemaColumns: ColumnConfig[];
  onChange: (header: string, column: ColumnConfig | null) => void;
}

function truncate(value: string, max = 20): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

export function ColumnMappingRow({ mapping, schemaColumns, onChange }: ColumnMappingRowProps) {
  const needsManual =
    mapping.confidenceLevel === "LOW" || mapping.confidenceLevel === "UNMAPPED";

  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-3 py-3 text-sm font-medium text-text-primary">
        {mapping.uploadedHeader}
      </td>
      <td className="px-3 py-3 text-sm text-text-secondary">
        {mapping.sampleValues.length > 0
          ? mapping.sampleValues.map(truncate).join(" · ")
          : "—"}
      </td>
      <td className="px-3 py-3 text-sm">
        {needsManual || mapping.isManualOverride ? (
          <Select
            value={mapping.matchedColumn?.supabaseColumn ?? "__skip__"}
            onValueChange={(value) => {
              if (value === "__skip__") {
                onChange(mapping.uploadedHeader, null);
                return;
              }
              const column = schemaColumns.find((item) => item.supabaseColumn === value);
              onChange(mapping.uploadedHeader, column ?? null);
            }}
          >
            <SelectTrigger className="h-9 w-full max-w-xs">
              <SelectValue placeholder="Select field" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__skip__">— Skip this column —</SelectItem>
              {schemaColumns.map((column) => (
                <SelectItem key={column.supabaseColumn} value={column.supabaseColumn}>
                  {column.frontendLabel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-text-primary">
            {mapping.matchedColumn?.frontendLabel ?? "— Skip this column —"}
          </span>
        )}
      </td>
      <td className="px-3 py-3">
        <ConfidenceBadge level={mapping.confidenceLevel} score={mapping.confidence} />
      </td>
      <td className="px-3 py-3 text-xs text-text-muted">
        {mapping.isManualOverride ? "Manual" : "Auto"}
      </td>
    </tr>
  );
}

export function MappingTableHeader() {
  return (
    <thead>
      <tr className="border-b border-border bg-surface-muted/50 text-left text-xs uppercase tracking-wide text-text-muted">
        <th className="px-3 py-2 font-medium">Uploaded Header</th>
        <th className="px-3 py-2 font-medium">Sample Values</th>
        <th className="px-3 py-2 font-medium">Mapped To</th>
        <th className="px-3 py-2 font-medium">Confidence</th>
        <th className="px-3 py-2 font-medium">Action</th>
      </tr>
    </thead>
  );
}

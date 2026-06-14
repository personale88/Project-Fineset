"use client";

import type { Content } from "@/content/en";
import type { ColumnConfig, ColumnMappingResult } from "@/lib/import-engine/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfidenceBadge } from "./ConfidenceBadge";

type MappingCopy = Content["import"]["mapping"];

interface ColumnMappingRowProps {
  mapping: ColumnMappingResult;
  schemaColumns: ColumnConfig[];
  onChange: (header: string, column: ColumnConfig | null) => void;
  copy: MappingCopy;
}

function truncate(value: string, max = 28): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function showMappingEditor(mapping: ColumnMappingResult): boolean {
  return (
    mapping.isManualOverride ||
    mapping.confidenceLevel === "MEDIUM" ||
    mapping.confidenceLevel === "LOW" ||
    mapping.confidenceLevel === "UNMAPPED"
  );
}

export function ColumnMappingRow({
  mapping,
  schemaColumns,
  onChange,
  copy,
}: ColumnMappingRowProps) {
  const editable = showMappingEditor(mapping);

  return (
    <tr className="border-b border-border last:border-0">
      <td className="min-w-[8rem] max-w-[10rem] px-3 py-3 align-top text-sm font-medium text-text-primary">
        <span className="break-words">{mapping.uploadedHeader}</span>
      </td>
      <td className="min-w-[10rem] max-w-[14rem] px-3 py-3 align-top text-sm text-text-secondary">
        {mapping.sampleValues.length > 0 ? (
          <div className="space-y-1">
            <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">
              {copy.previewPrefix}
            </p>
            <ul className="space-y-0.5 break-words text-text-secondary">
              {mapping.sampleValues.map((value, index) => (
                <li key={`${mapping.uploadedHeader}-${index}-${value}`}>
                  {truncate(value)}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <span className="text-text-muted">{copy.previewEmpty}</span>
        )}
      </td>
      <td className="min-w-[12rem] px-3 py-3 align-top text-sm">
        {editable ? (
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
            <SelectTrigger className="h-9 w-full min-w-[11rem] max-w-[14rem]">
              <SelectValue placeholder="Select field" />
            </SelectTrigger>
            <SelectContent className="z-[120] max-h-96">
              <SelectItem value="__skip__">— Skip this column —</SelectItem>
              {schemaColumns.map((column) => (
                <SelectItem key={column.supabaseColumn} value={column.supabaseColumn}>
                  {column.frontendLabel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="inline-block max-w-[14rem] break-words text-text-primary">
            {mapping.matchedColumn?.frontendLabel ?? "— Skip this column —"}
          </span>
        )}
      </td>
      <td className="whitespace-nowrap px-3 py-3 align-top">
        <ConfidenceBadge level={mapping.confidenceLevel} score={mapping.confidence} />
      </td>
      <td className="whitespace-nowrap px-3 py-3 align-top text-xs text-text-muted">
        {mapping.isManualOverride ? copy.actionManual : copy.actionAuto}
      </td>
    </tr>
  );
}

interface MappingTableHeaderProps {
  copy: MappingCopy["columns"];
}

export function MappingTableHeader({ copy }: MappingTableHeaderProps) {
  return (
    <thead className="sticky top-0 z-10 bg-surface-muted/95 backdrop-blur-sm">
      <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-muted">
        <th className="px-3 py-2 font-medium">{copy.uploadedHeader}</th>
        <th className="px-3 py-2 font-medium">
          <span className="block">{copy.preview}</span>
          <span className="mt-0.5 block text-[10px] font-normal normal-case tracking-normal text-text-muted">
            {copy.previewHint}
          </span>
        </th>
        <th className="px-3 py-2 font-medium">{copy.mappedTo}</th>
        <th className="px-3 py-2 font-medium">{copy.confidence}</th>
        <th className="px-3 py-2 font-medium">{copy.action}</th>
      </tr>
    </thead>
  );
}

import type {
  ColumnMappingResult,
  FeatureSchemaConfig,
  ImportPreview,
  RowError,
  TransformedRow,
} from "@/lib/import-engine/types";
import { missingRequiredColumns } from "@/lib/import-engine/core/columnMatcher";
import {
  collectErrorSummaries,
  collectWarningSummaries,
} from "@/lib/import-engine/core/issueSummaries";

export function buildImportPreview(
  transformedRows: TransformedRow[],
  mappings: ColumnMappingResult[],
  schema: FeatureSchemaConfig,
): ImportPreview {
  const totalRows = transformedRows.length;
  const validRows = transformedRows.filter((row) => row.status === "valid").length;
  const errorRows = transformedRows.filter((row) => row.status === "error").length;
  const warningRows = transformedRows.filter((row) => row.status === "warning").length;
  const skippedRows = transformedRows.filter((row) => row.status === "skipped").length;

  const newCustomers = transformedRows.filter((row) => row.customerType === "new").length;
  const repeatCustomers = transformedRows.filter((row) => row.customerType === "repeat").length;
  const ambiguousCustomers = transformedRows.filter(
    (row) => row.customerType === "unknown" && row.errors.some((e) => e.code === "DEDUPE_AMBIGUOUS"),
  ).length;

  const unmappedUploadedColumns = mappings
    .filter((mapping) => !mapping.matchedColumn)
    .map((mapping) => mapping.uploadedHeader);

  const sampleErrors = collectSampleErrors(transformedRows, 10);
  const missingRequired = missingRequiredColumns(mappings, schema);
  const errorSummaries = collectErrorSummaries(transformedRows);
  const warningSummaries = collectWarningSummaries(transformedRows);

  return {
    totalRows,
    validRows,
    errorRows,
    warningRows,
    skippedRows,
    newCustomers,
    repeatCustomers,
    ambiguousCustomers,
    columnMappings: mappings,
    sampleErrors,
    errorSummaries,
    warningSummaries,
    unmappedUploadedColumns,
    missingRequiredColumns: missingRequired,
  };
}

function collectSampleErrors(rows: TransformedRow[], limit: number): RowError[] {
  const seenCodes = new Set<string>();
  const samples: RowError[] = [];

  for (const row of rows) {
    for (const error of row.errors) {
      if (seenCodes.has(error.code)) continue;
      seenCodes.add(error.code);
      samples.push(error);
      if (samples.length >= limit) break;
    }
    if (samples.length >= limit) break;
  }

  return samples;
}

export function rowsForImport(rows: TransformedRow[]): TransformedRow[] {
  return rows.filter((row) => row.status === "valid" || row.status === "warning");
}

export function previewCountsForDedupeAmbiguous(rows: TransformedRow[]): number {
  return rows.filter((row) =>
    row.errors.some((error) => error.code === "DEDUPE_AMBIGUOUS"),
  ).length;
}

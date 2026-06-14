import type {
  ColumnConfig,
  ColumnMappingResult,
  DedupeResult,
  ErrorCode,
  FeatureSchemaConfig,
  ImportTransformOptions,
  RowError,
  RowWarning,
  TransformedRow,
} from "@/lib/import-engine/types";
import { DEFAULT_IMPORT_TRANSFORM_OPTIONS } from "@/lib/import-engine/types";
import { duplicateInFileRowIndexes } from "@/lib/import-engine/core/deduplicator";
import { parseDate, parseDurationToMinutes, parseDurationToSeconds, parseTime } from "@/lib/import-engine/utils/dateParser";
import { normalizeRawValue } from "@/lib/import-engine/utils/emptyPlaceholder";
import {
  normalizeEnumValue,
  normalizeListValues,
} from "@/lib/import-engine/utils/enumNormaliser";
import { normalisePhone } from "@/lib/import-engine/utils/phoneNormaliser";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CALL_OUTCOME_MAP: Record<string, string> = {
  interested: "ANSWERED",
  not_interested: "ANSWERED",
  callback: "ANSWERED",
  converted: "ANSWERED",
  no_answer: "NOT_ANSWERED",
  "no answer": "NOT_ANSWERED",
  answered: "ANSWERED",
  "not answered": "NOT_ANSWERED",
};

function isEmptyRow(row: Record<string, string>): boolean {
  return Object.values(row).every((value) => value.trim() === "");
}

function mappingByHeader(
  mappings: ColumnMappingResult[],
): Map<string, ColumnMappingResult> {
  return new Map(mappings.map((mapping) => [mapping.uploadedHeader, mapping]));
}

function mappedSchemaColumns(
  mappings: ColumnMappingResult[],
): Map<string, { config: ColumnConfig; uploadedHeader: string | null }> {
  const result = new Map<string, { config: ColumnConfig; uploadedHeader: string | null }>();
  for (const mapping of mappings) {
    if (!mapping.matchedColumn) continue;
    result.set(mapping.matchedColumn.supabaseColumn, {
      config: mapping.matchedColumn,
      uploadedHeader: mapping.uploadedHeader,
    });
  }
  return result;
}

function rawValueForColumn(
  row: Record<string, string>,
  column: ColumnConfig,
  mappings: ColumnMappingResult[],
): string | null {
  const mapping = mappings.find(
    (item) => item.matchedColumn?.supabaseColumn === column.supabaseColumn,
  );
  if (!mapping) return null;
  const value = row[mapping.uploadedHeader];
  return value === undefined ? null : value;
}

function parseBoolean(value: string): boolean | null {
  const normalised = value.trim().toLowerCase();
  if (["yes", "true", "1", "y"].includes(normalised)) return true;
  if (["no", "false", "0", "n"].includes(normalised)) return false;
  return null;
}

function stripCurrency(value: string): string {
  return value.replace(/[₹$,]/g, "").trim();
}

interface TransformValueResult {
  value: unknown;
  errors: RowError[];
  warnings: RowWarning[];
}

function transformValue(
  column: ColumnConfig,
  raw: string | null,
  schema: FeatureSchemaConfig,
  lookupCache: Map<string, Map<string, string>>,
  transformOptions: ImportTransformOptions,
): TransformValueResult {
  const errors: RowError[] = [];
  const warnings: RowWarning[] = [];

  if (raw === null) {
    if (column.defaultValue !== undefined) return { value: column.defaultValue, errors, warnings };
    return { value: null, errors, warnings };
  }

  const normalizedRaw = normalizeRawValue(raw);
  if (normalizedRaw === null) {
    if (column.defaultValue !== undefined) return { value: column.defaultValue, errors, warnings };
    return { value: null, errors, warnings };
  }

  const trimmed = normalizedRaw;

  switch (column.type) {
    case "string": {
      return { value: trimmed.length > 0 ? trimmed : null, errors, warnings };
    }
    case "number": {
      if (
        schema.featureKey === "call_log" &&
        column.supabaseColumn === "durationSeconds"
      ) {
        const duration = parseDurationToSeconds(trimmed);
        if (duration === null) {
          if (column.required) {
            errors.push({
              column: column.frontendLabel,
              message: `"${trimmed}" is not a valid duration`,
              code: "TYPE_MISMATCH",
            });
          } else {
            warnings.push({
              column: column.frontendLabel,
              message: `"${trimmed}" could not be parsed as a duration`,
            });
          }
          return { value: null, errors, warnings };
        }
        return { value: duration, errors, warnings };
      }

      if (
        schema.featureKey === "visit_log" &&
        column.supabaseColumn === "durationMins"
      ) {
        const duration = parseDurationToMinutes(trimmed);
        if (duration === null) {
          if (column.required) {
            errors.push({
              column: column.frontendLabel,
              message: `"${trimmed}" is not a valid duration`,
              code: "TYPE_MISMATCH",
            });
          } else {
            warnings.push({
              column: column.frontendLabel,
              message: `"${trimmed}" could not be parsed as a duration`,
            });
          }
          return { value: null, errors, warnings };
        }
        return { value: duration, errors, warnings };
      }

      const numeric = Number(stripCurrency(trimmed));
      if (!Number.isFinite(numeric)) {
        if (column.required) {
          errors.push({
            column: column.frontendLabel,
            message: `"${trimmed}" is not a valid number`,
            code: "TYPE_MISMATCH",
          });
        } else {
          warnings.push({
            column: column.frontendLabel,
            message: `"${trimmed}" could not be parsed as a number`,
          });
        }
        return { value: null, errors, warnings };
      }
      return { value: numeric, errors, warnings };
    }
    case "date": {
      const parsed = parseDate(trimmed, column.dateFormats ?? []);
      if (!parsed) {
        const timeParsed = parseTime(trimmed);
        if (timeParsed) {
          return { value: timeParsed, errors, warnings };
        }
        const code: ErrorCode = column.required ? "INVALID_DATE" : "INVALID_DATE";
        if (column.required) {
          errors.push({
            column: column.frontendLabel,
            message: `"${trimmed}" is not a valid date`,
            code,
          });
        } else {
          warnings.push({
            column: column.frontendLabel,
            message: `"${trimmed}" could not be parsed as a date`,
          });
        }
        return { value: null, errors, warnings };
      }
      return { value: parsed, errors, warnings };
    }
    case "phone": {
      const phone = normalisePhone(trimmed);
      if (!phone) {
        if (transformOptions.importInvalidPhoneAsEmpty) {
          warnings.push({
            column: column.frontendLabel,
            message: `"${trimmed}" could not be parsed as a phone number — importing with empty phone`,
          });
          return { value: null, errors, warnings };
        }
        errors.push({
          column: column.frontendLabel,
          message: `"${trimmed}" is not a valid phone number`,
          code: "INVALID_PHONE",
        });
        return { value: null, errors, warnings };
      }
      return { value: phone, errors, warnings };
    }
    case "email": {
      if (!EMAIL_REGEX.test(trimmed)) {
        warnings.push({
          column: column.frontendLabel,
          message: `"${trimmed}" does not look like a valid email`,
        });
        return { value: null, errors, warnings };
      }
      return { value: trimmed.toLowerCase(), errors, warnings };
    }
    case "boolean": {
      return { value: parseBoolean(trimmed), errors, warnings };
    }
    case "lookup": {
      const table = column.lookupTable ?? "";
      const tableCache = lookupCache.get(table);
      const key = tableCache?.get(trimmed.toLowerCase());
      if (!key) {
        warnings.push({
          column: column.frontendLabel,
          message: `"${trimmed}" was not found in ${table}`,
        });
        return { value: null, errors, warnings };
      }
      return { value: key, errors, warnings };
    }
    case "enum": {
      const allowed = column.enumValues ?? [];
      const normalised = normalizeEnumValue(trimmed, allowed, column.enumLabels);
      if (!normalised) {
        if (column.required) {
          errors.push({
            column: column.frontendLabel,
            message: `"${trimmed}" is not a recognised value`,
            code: "TYPE_MISMATCH",
          });
        } else {
          warnings.push({
            column: column.frontendLabel,
            message: `"${trimmed}" could not be matched to a known option`,
          });
        }
        return { value: null, errors, warnings };
      }
      return { value: normalised, errors, warnings };
    }
    case "list": {
      const items = normalizeListValues(trimmed, column.enumValues, column.enumLabels);
      if (items.length === 0 && trimmed.length > 0) {
        warnings.push({
          column: column.frontendLabel,
          message: `"${trimmed}" could not be parsed as a list`,
        });
      }
      return { value: items, errors, warnings };
    }
    case "time": {
      const parsed = parseTime(trimmed);
      if (!parsed) {
        if (column.required) {
          errors.push({
            column: column.frontendLabel,
            message: `"${trimmed}" is not a valid time`,
            code: "TYPE_MISMATCH",
          });
        } else {
          warnings.push({
            column: column.frontendLabel,
            message: `"${trimmed}" could not be parsed as a time`,
          });
        }
        return { value: null, errors, warnings };
      }
      return { value: parsed, errors, warnings };
    }
    default:
      return { value: trimmed, errors, warnings };
  }
}

function mapCallOutcome(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const mapped = CALL_OUTCOME_MAP[value.trim().toLowerCase()];
  return mapped ?? value.trim().toUpperCase();
}

export async function transformRows(
  parsedRows: Record<string, string>[],
  mappings: ColumnMappingResult[],
  schema: FeatureSchemaConfig,
  lookupCache: Map<string, Map<string, string>>,
  dedupeResults: DedupeResult[],
  transformOptions: ImportTransformOptions = DEFAULT_IMPORT_TRANSFORM_OPTIONS,
): Promise<TransformedRow[]> {
  const dedupeByIndex = new Map(dedupeResults.map((result) => [result.rowIndex, result]));
  const duplicateIndexes = duplicateInFileRowIndexes(
    parsedRows.map((row, index) => {
      const phoneHeader = mappings.find(
        (mapping) => mapping.matchedColumn?.supabaseColumn === "phone",
      )?.uploadedHeader;
      const phone = phoneHeader ? row[phoneHeader] : undefined;
      return { rowIndex: index, phone: phone ?? null, email: null };
    }),
  );

  const columnMap = mappedSchemaColumns(mappings);
  const transformed: TransformedRow[] = [];

  for (let index = 0; index < parsedRows.length; index += 1) {
    const rawData = parsedRows[index];

    if (isEmptyRow(rawData)) {
      transformed.push({
        originalIndex: index,
        rawData,
        transformedData: {},
        customerData: {},
        status: "skipped",
        errors: [{ column: "_row", message: "Row is empty", code: "EMPTY_ROW" }],
        warnings: [],
        customerType: "unknown",
      });
      continue;
    }

    const errors: RowError[] = [];
    const warnings: RowWarning[] = [];
    const transformedData: Record<string, unknown> = {};
    const customerData: Record<string, unknown> = {};

    for (const column of schema.columns) {
      const raw = rawValueForColumn(rawData, column, mappings);
      const hasMapping = columnMap.has(column.supabaseColumn);

      if (!hasMapping) {
        transformedData[column.supabaseColumn] = null;
        if (column.isCustomerField) customerData[column.supabaseColumn] = null;
        if (column.required) {
          errors.push({
            column: column.frontendLabel,
            message: "Required column is not mapped",
            code: "REQUIRED_MISSING",
          });
        }
        continue;
      }

      const result = transformValue(column, raw, schema, lookupCache, transformOptions);
      errors.push(...result.errors);
      warnings.push(...result.warnings);

      let value = result.value;
      if (schema.featureKey === "call_log" && column.supabaseColumn === "answered") {
        value = mapCallOutcome(value);
      }

      if (column.isCustomerField) {
        customerData[column.supabaseColumn] = value;
      } else {
        transformedData[column.supabaseColumn] = value;
      }
    }

    const dedupe = dedupeByIndex.get(index);
    const customerType: TransformedRow["customerType"] =
      dedupe?.customerType === "ambiguous"
        ? "unknown"
        : (dedupe?.customerType ?? "unknown");

    if (duplicateIndexes.has(index)) {
      warnings.push({
        column: "phone",
        message: "Duplicate phone number within the uploaded file",
      });
    }

    if (dedupe?.customerType === "ambiguous") {
      errors.push({
        column: "phone",
        message: "Phone and email match different existing customers",
        code: "DEDUPE_AMBIGUOUS",
      });
    }

    const hardErrors = errors.filter((error) =>
      isHardError(error.code, schema, error.column),
    );

    let status: TransformedRow["status"] = "valid";
    if (hardErrors.length > 0) status = "error";
    else if (warnings.length > 0 || errors.length > 0) status = "warning";

    transformed.push({
      originalIndex: index,
      rawData,
      transformedData,
      customerData,
      status,
      errors,
      warnings,
      customerType,
      existingCustomerId: dedupe?.existingCustomerId,
      generatedCustomerId: dedupe?.generatedCustomerId,
    });
  }

  return transformed;
}

function isHardError(code: ErrorCode, schema: FeatureSchemaConfig, columnLabel: string): boolean {
  if (code === "REQUIRED_MISSING" || code === "DEDUPE_AMBIGUOUS" || code === "DUPLICATE_IN_FILE") {
    return true;
  }
  if (code === "INVALID_PHONE") {
    const column = schema.columns.find((item) => item.frontendLabel === columnLabel);
    return Boolean(column?.isDedupeKey);
  }
  if (code === "TYPE_MISMATCH") {
    const column = schema.columns.find((item) => item.frontendLabel === columnLabel);
    return Boolean(column?.required);
  }
  return false;
}

export function buildLookupCacheFromRecords(
  table: string,
  records: Array<{ display: string; key: string }>,
): Map<string, Map<string, string>> {
  const cache = new Map<string, Map<string, string>>();
  const tableCache = new Map<string, string>();
  for (const record of records) {
    tableCache.set(record.display.trim().toLowerCase(), record.key);
  }
  cache.set(table, tableCache);
  return cache;
}

export function mergeLookupCaches(
  ...caches: Map<string, Map<string, string>>[]
): Map<string, Map<string, string>> {
  const merged = new Map<string, Map<string, string>>();
  for (const cache of caches) {
    for (const [table, tableCache] of cache.entries()) {
      const existing = merged.get(table) ?? new Map<string, string>();
      for (const [display, key] of tableCache.entries()) {
        existing.set(display, key);
      }
      merged.set(table, existing);
    }
  }
  return merged;
}

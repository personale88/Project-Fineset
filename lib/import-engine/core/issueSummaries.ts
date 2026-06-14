import type {
  ErrorCode,
  ImportIssueSummary,
  RowWarning,
  TransformedRow,
} from "@/lib/import-engine/types";

const ERROR_META: Record<
  ErrorCode,
  { fixHint: string; sampleMessage?: string }
> = {
  INVALID_PHONE: {
    fixHint:
      "Use a single valid mobile number (10 digits), leave blank, or use placeholders like “-” or “- - - -” if unknown. Multiple numbers separated by / use the first valid one. Enable “Import rows with invalid or missing phone numbers” to keep the row with an empty phone.",
    sampleMessage: "Phone number could not be recognised",
  },
  REQUIRED_MISSING: {
    fixHint: "Go back to column mapping and map this required store field to a column in your file.",
    sampleMessage: "Required column is not mapped",
  },
  TYPE_MISMATCH: {
    fixHint:
      "Correct the value in your spreadsheet to match the expected format, or leave the cell blank if the field is optional.",
    sampleMessage: "Value does not match the expected format",
  },
  INVALID_EMAIL: {
    fixHint: "Enter a valid email address, or leave the cell blank.",
    sampleMessage: "Email format is invalid",
  },
  INVALID_DATE: {
    fixHint:
      "Use a standard date format (e.g. 01/06/2026 or 1-Jun-2026), or leave the cell blank.",
    sampleMessage: "Date could not be parsed",
  },
  LOOKUP_NOT_FOUND: {
    fixHint:
      "Make sure names in your file exactly match records in the store (e.g. staff names in Settings).",
    sampleMessage: "Lookup value was not found",
  },
  DEDUPE_AMBIGUOUS: {
    fixHint:
      "Phone and email point to different existing customers. Fix the row in your file so both match the same person, or remove one identifier.",
    sampleMessage: "Phone and email match different existing customers",
  },
  EMPTY_ROW: {
    fixHint: "Remove blank rows from your spreadsheet before importing.",
    sampleMessage: "Row is empty",
  },
  DUPLICATE_IN_FILE: {
    fixHint:
      "The same phone appears more than once in your file. Remove duplicates if unintended — otherwise the row still imports.",
    sampleMessage: "Duplicate phone number within the uploaded file",
  },
};

type WarningKind =
  | "lookup_not_found"
  | "invalid_date"
  | "invalid_time"
  | "invalid_number"
  | "invalid_duration"
  | "invalid_enum"
  | "invalid_list"
  | "invalid_email"
  | "duplicate_phone"
  | "other";

const WARNING_META: Record<
  WarningKind,
  { fixHint: string; sampleMessage: string }
> = {
  lookup_not_found: {
    sampleMessage: "Staff or lookup value was not found in the store",
    fixHint:
      "Check that names in your file exactly match staff (or other lookup records) in the store. Add missing staff in Settings, or fix spelling in the spreadsheet.",
  },
  invalid_date: {
    sampleMessage: "Date could not be parsed",
    fixHint:
      "Use dd/MM/yyyy, yyyy-MM-dd, or 1-Jun-2026. Leave blank or use “-” if the date is unknown.",
  },
  invalid_time: {
    sampleMessage: "Time could not be parsed",
    fixHint: "Use formats like 10:30, 10:30 AM, or 10.30. Leave blank if unknown.",
  },
  invalid_number: {
    sampleMessage: "Number could not be parsed",
    fixHint: "Enter a plain number (e.g. 15000). Leave blank or use “-” if not applicable.",
  },
  invalid_duration: {
    sampleMessage: "Duration could not be parsed",
    fixHint:
      "Use minutes (e.g. 90), clock style (1:30), or phrases like 1HR 2 MINS. Leave blank if unknown.",
  },
  invalid_enum: {
    sampleMessage: "Value does not match a known option",
    fixHint:
      "Use one of the allowed dropdown values from the import template, or leave blank if optional.",
  },
  invalid_list: {
    sampleMessage: "List value could not be parsed",
    fixHint: "Separate multiple items with commas. Use recognised category names from the template.",
  },
  invalid_email: {
    sampleMessage: "Email does not look valid",
    fixHint: "Enter a valid email or leave the cell blank.",
  },
  duplicate_phone: {
    sampleMessage: "Duplicate phone number within the uploaded file",
    fixHint:
      "The same phone appears on multiple rows. This is allowed — all rows will import, linked to the same customer.",
  },
  other: {
    sampleMessage: "Field could not be fully validated",
    fixHint: "Review the value in your spreadsheet or adjust column mapping, then re-import if needed.",
  },
};

function classifyWarning(warning: RowWarning): WarningKind {
  const message = warning.message.toLowerCase();

  if (message.includes("was not found in")) return "lookup_not_found";
  if (message.includes("could not be parsed as a date")) return "invalid_date";
  if (message.includes("could not be parsed as a time")) return "invalid_time";
  if (message.includes("could not be parsed as a duration")) return "invalid_duration";
  if (message.includes("could not be parsed as a number")) return "invalid_number";
  if (message.includes("could not be matched to a known option")) return "invalid_enum";
  if (message.includes("could not be parsed as a list")) return "invalid_list";
  if (message.includes("does not look like a valid email")) return "invalid_email";
  if (message.includes("duplicate phone number within the uploaded file")) return "duplicate_phone";

  return "other";
}

function warningKey(warning: RowWarning): string {
  return `${warning.column}|${classifyWarning(warning)}`;
}

export function collectErrorSummaries(rows: TransformedRow[]): ImportIssueSummary[] {
  const groups = new Map<
    string,
    { code: ErrorCode; column: string; message: string; rowIndexes: Set<number> }
  >();

  for (const row of rows) {
    if (row.status !== "error") continue;

    for (const error of row.errors) {
      const key = `${error.code}|${error.column}`;
      const existing = groups.get(key);
      if (existing) {
        existing.rowIndexes.add(row.originalIndex);
        continue;
      }

      groups.set(key, {
        code: error.code,
        column: error.column,
        message: error.message,
        rowIndexes: new Set([row.originalIndex]),
      });
    }
  }

  return [...groups.values()]
    .map((group) => {
      const meta = ERROR_META[group.code];
      return {
        id: `${group.code}-${group.column}`,
        column: group.column,
        message: group.message || meta.sampleMessage || group.code,
        count: group.rowIndexes.size,
        severity: "blocking" as const,
        fixHint: meta.fixHint,
        willImport: false,
      };
    })
    .sort((a, b) => b.count - a.count);
}

export function collectWarningSummaries(rows: TransformedRow[]): ImportIssueSummary[] {
  const groups = new Map<
    string,
    { column: string; kind: WarningKind; message: string; rowIndexes: Set<number> }
  >();

  for (const row of rows) {
    if (row.status !== "warning") continue;

    for (const warning of row.warnings) {
      const kind = classifyWarning(warning);
      const key = warningKey(warning);
      const existing = groups.get(key);
      if (existing) {
        existing.rowIndexes.add(row.originalIndex);
        continue;
      }

      groups.set(key, {
        column: warning.column,
        kind,
        message: warning.message,
        rowIndexes: new Set([row.originalIndex]),
      });
    }
  }

  return [...groups.values()]
    .map((group) => {
      const meta = WARNING_META[group.kind];
      return {
        id: `${group.kind}-${group.column}`,
        column: group.column,
        message: meta.sampleMessage,
        count: group.rowIndexes.size,
        severity: "review" as const,
        fixHint: meta.fixHint,
        willImport: true,
      };
    })
    .sort((a, b) => b.count - a.count);
}

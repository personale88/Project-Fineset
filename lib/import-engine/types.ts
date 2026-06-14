export type ColumnType =
  | "string"
  | "number"
  | "date"
  | "boolean"
  | "phone"
  | "email"
  | "lookup"
  | "enum"
  | "list"
  | "time";

export interface ColumnConfig {
  /** Label shown in mapping UI */
  frontendLabel: string;
  /** Actual column name in Supabase */
  supabaseColumn: string;
  type: ColumnType;
  required: boolean;
  /** Used to match existing customers */
  isDedupeKey?: boolean;
  /** True if this column lives in customers table */
  isCustomerField?: boolean;
  /** For type:'lookup' — table to join */
  lookupTable?: string;
  /** Column in lookupTable to match against */
  lookupDisplayColumn?: string;
  /** Column in lookupTable to return as value */
  lookupKeyColumn?: string;
  /** For type:'date' — accepted input formats */
  dateFormats?: string[];
  /** Extra header aliases for auto-mapping */
  synonyms?: string[];
  /** For type:'enum' | type:'list' — allowed stored values */
  enumValues?: readonly string[];
  /** For type:'enum' | type:'list' — enum value → display label */
  enumLabels?: Record<string, string>;
  /** Used when column is missing from file */
  defaultValue?: unknown;
}

export interface FeatureSchemaConfig {
  /** e.g. 'visit_log' | 'call_log' */
  featureKey: string;
  /** Display name: 'Visit Log' */
  featureLabel: string;
  /** Primary table to upsert into */
  supabaseTable: string;
  /** Always 'customers' */
  customerTable: string;
  /** FK column in supabaseTable pointing to customer */
  customerIdColumn: string;
  /** Supabase column names to dedupe customers on */
  dedupeKeys: string[];
  columns: ColumnConfig[];
}

export interface ParsedSheet {
  name: string;
  headers: string[];
  rows: Record<string, string>[];
  emptyRowCount: number;
}

export interface ParsedFile {
  headers: string[];
  /** Raw strings, untyped */
  rows: Record<string, string>[];
  totalRows: number;
  fileName: string;
  fileSize: number;
  encoding: string;
  /** File-level warnings (encoding issues, etc.) */
  warnings: string[];
  /** Per-sheet data for multi-tab Excel selection UI */
  sheetData?: ParsedSheet[];
  /** Empty tab names omitted from sheetData */
  emptySheetNames?: string[];
}

export type ConfidenceLevel = "HIGH" | "MEDIUM" | "LOW" | "UNMAPPED";

export interface ColumnMappingResult {
  uploadedHeader: string;
  matchedColumn: ColumnConfig | null;
  /** 0–100 */
  confidence: number;
  confidenceLevel: ConfidenceLevel;
  isManualOverride: boolean;
  /** First 3 values from this column */
  sampleValues: string[];
}

export type RowStatus = "valid" | "warning" | "error" | "skipped";

export interface RowError {
  column: string;
  message: string;
  code: ErrorCode;
}

export interface RowWarning {
  column: string;
  message: string;
}

export type ErrorCode =
  | "REQUIRED_MISSING"
  | "TYPE_MISMATCH"
  | "INVALID_PHONE"
  | "INVALID_EMAIL"
  | "INVALID_DATE"
  | "LOOKUP_NOT_FOUND"
  | "DEDUPE_AMBIGUOUS"
  | "EMPTY_ROW"
  | "DUPLICATE_IN_FILE";

export interface TransformedRow {
  originalIndex: number;
  rawData: Record<string, string>;
  transformedData: Record<string, unknown>;
  /** Fields that go to customers table */
  customerData: Record<string, unknown>;
  status: RowStatus;
  errors: RowError[];
  warnings: RowWarning[];
  customerType: "new" | "repeat" | "unknown";
  existingCustomerId?: string;
  generatedCustomerId?: string;
}

/** Pre-import summary (shown in confirmation modal) */
export interface ImportIssueSummary {
  id: string;
  column: string;
  message: string;
  count: number;
  severity: "blocking" | "review";
  fixHint: string;
  willImport: boolean;
}

export interface ImportPreview {
  totalRows: number;
  validRows: number;
  errorRows: number;
  warningRows: number;
  skippedRows: number;
  newCustomers: number;
  repeatCustomers: number;
  ambiguousCustomers: number;
  columnMappings: ColumnMappingResult[];
  /** First 10 errors for preview */
  sampleErrors: RowError[];
  /** Grouped blocking issues with fix guidance */
  errorSummaries: ImportIssueSummary[];
  /** Grouped non-blocking issues with fix guidance */
  warningSummaries: ImportIssueSummary[];
  unmappedUploadedColumns: string[];
  missingRequiredColumns: string[];
}

/** Payload sent to Edge Function */
export interface ImportPayload {
  featureKey: string;
  batchId: string;
  rows: TransformedRow[];
  columnMappings: ColumnMappingResult[];
}

/** Response from Edge Function */
export interface ImportResult {
  batchId: string;
  totalProcessed: number;
  successCount: number;
  errorCount: number;
  newCustomersCreated: number;
  repeatCustomersUpdated: number;
  errors: Array<{ rowIndex: number; error: string }>;
  durationMs: number;
}

export interface ImportHistoryRecord {
  id: string;
  batchId: string;
  featureKey: string;
  fileName: string;
  totalRows: number;
  successCount: number;
  errorCount: number;
  newCustomers: number;
  repeatCustomers: number;
  importedBy: string;
  importedAt: string;
  /** True if within 24h window */
  canRollback: boolean;
}

/** Result of customer dedup for a single row */
export interface DedupeResult {
  rowIndex: number;
  customerType: "new" | "repeat" | "ambiguous";
  existingCustomerId?: string;
  generatedCustomerId?: string;
}

export type ImportWizardStep = "upload" | "mapping" | "confirm" | "progress" | "summary";

/** Options for auto-fixing spreadsheet values during transform */
export interface ImportTransformOptions {
  /** Import rows when phone cannot be parsed; store phone as empty */
  importInvalidPhoneAsEmpty: boolean;
}

export const DEFAULT_IMPORT_TRANSFORM_OPTIONS: ImportTransformOptions = {
  importInvalidPhoneAsEmpty: true,
};

/** Client-side dedup runs against store-scoped customer records via API */
export interface CustomerDedupeRecord {
  id: string;
  phoneHash: string;
  email?: string | null;
}

export interface CustomerDedupeClient {
  findByPhoneHashes(
    phoneHashes: string[],
    storeId: string,
  ): Promise<CustomerDedupeRecord[]>;
  findByEmails?(emails: string[], storeId: string): Promise<CustomerDedupeRecord[]>;
}

export interface ColumnMatchOutput {
  mappings: ColumnMappingResult[];
  unmappedSchemaColumns: ColumnConfig[];
}

export class ImportEngineError extends Error {
  constructor(
    message: string,
    public code:
      | "FILE_TOO_LARGE"
      | "ROW_LIMIT_EXCEEDED"
      | "UNSUPPORTED_FORMAT"
      | "PARSE_FAILED"
      | "INVALID_PAYLOAD",
  ) {
    super(message);
    this.name = "ImportEngineError";
  }
}

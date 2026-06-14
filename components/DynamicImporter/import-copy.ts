import type { ImportTargetTable, MergeStrategy } from "./types";

export const WIZARD_STEPS = [
  { id: 1, label: "Match columns" },
  { id: 2, label: "Review & import" },
  { id: 3, label: "Done" },
] as const;

export type WizardStepId = (typeof WIZARD_STEPS)[number]["id"];

export interface ImportTypeCopy {
  title: string;
  subtitle: string;
  dropTips: string[];
  requiredFieldsHint: string;
}

const IMPORT_TYPE_COPY: Record<ImportTargetTable, ImportTypeCopy> = {
  visit_logs: {
    title: "Import visits",
    subtitle: "Upload a spreadsheet from your old tracker or CRM.",
    dropTips: [
      "First row should be column headers (e.g. Customer Name, Phone, Visit Date).",
      "Customer name and phone help us match or create customers.",
      "Include a staff name or employee ID if visits belong to different team members.",
    ],
    requiredFieldsHint: "customerName and customerPhone",
  },
  call_logs: {
    title: "Import call history",
    subtitle: "Upload call notes or outbound call lists from a spreadsheet.",
    dropTips: [
      "Include customer phone so we can link calls to the right person.",
      "Answered / Not answered columns map automatically when named clearly.",
      "Staff name or ID helps assign calls to the right team member.",
    ],
    requiredFieldsHint: "customer phone (and staff if available)",
  },
  customers: {
    title: "Import customers",
    subtitle: "Upload a customer list from Excel or CSV.",
    dropTips: [
      "Phone number is the best way to spot duplicates we already have.",
      "Name and date of birth improve matching when phone is missing.",
      "Extra columns (area, address) are optional — map them if your file has them.",
    ],
    requiredFieldsHint: "name and phone",
  },
};

export function getImportTypeCopy(targetTable: ImportTargetTable): ImportTypeCopy {
  return IMPORT_TYPE_COPY[targetTable];
}

export function matchQualityLabel(confidence: number): {
  label: string;
  hint: string;
  tone: "good" | "check" | "skip";
} {
  if (confidence >= 0.85) {
    return { label: "Good match", hint: "Looks right — no action needed.", tone: "good" };
  }
  if (confidence >= 0.6) {
    return {
      label: "Please check",
      hint: "We’re not fully sure — pick the correct store field if needed.",
      tone: "check",
    };
  }
  return {
    label: "Not mapped",
    hint: "This column won’t be imported unless you choose a store field.",
    tone: "skip",
  };
}

export const MERGE_STRATEGY_COPY: Record<
  MergeStrategy,
  { label: string; description: string; recommended?: boolean }
> = {
  overwrite_nulls_only: {
    label: "Update missing details only",
    description:
      "Keep what we already have. Only fill in customer fields that are currently empty.",
    recommended: true,
  },
  overwrite_all: {
    label: "Replace with file data",
    description:
      "Use values from your spreadsheet when provided. Empty cells in the file won’t wipe existing data.",
  },
  skip: {
    label: "Don’t change existing customers",
    description:
      "Skip updates for people we already know. Only add rows for new customers.",
  },
};

export const IMPORT_UI_COPY = {
  dropzone: {
    dragLabel: "Drop your file here",
    browseLabel: "Choose file",
    formats: "CSV or Excel (.csv, .xlsx, .xls)",
  },
  loading: {
    parsing: "Reading your file…",
    mapping: "Matching columns to store fields…",
    schema: "Preparing import…",
  },
  mapping: {
    title: "Match your columns",
    description:
      "We matched your spreadsheet headers to store fields. Change anything that doesn’t look right, then continue.",
    yourColumn: "In your file",
    storeField: "Maps to",
    ignoreOption: "Don’t import this column",
    emptyFieldsTitle: "Optional fields",
    emptyFieldsDescription:
      "These store fields aren’t in your file — they’ll stay empty unless you map a column.",
    requiredWarning:
      "Some important fields aren’t mapped yet. You can still continue, but those rows may fail or import incomplete.",
    autoRemap: "Rematch with AI",
    autoRemapLoading: "Rematching…",
    saveTemplate: "Save this mapping",
    continue: "Continue",
    cancel: "Cancel import",
  },
  summary: {
    title: "Ready to import",
    description: "Review the counts below, then choose how to handle customers we already have.",
    totalRows: "Rows in file",
    newCustomers: "New customers",
    repeatCustomers: "Already in store",
    existingLabel: "When we find an existing customer",
    unmappedNote:
      "Some file columns won’t be imported. That’s OK if they were extra notes or duplicates.",
    back: "Back to mapping",
    import: "Start import",
    importing: "Starting…",
  },
  progress: {
    title: "Importing your data",
    description: (processed: number, total: number) =>
      `${processed} of ${total} rows processed — please keep this tab open.`,
    errors: (count: number) =>
      count === 0 ? "No errors so far." : `${count} row${count === 1 ? "" : "s"} need attention.`,
  },
  results: {
    successTitle: "Import complete",
    successBody: (imported: number, newCount: number, repeatCount: number) =>
      `${imported} row${imported === 1 ? "" : "s"} imported — ${newCount} new, ${repeatCount} matched existing customers.`,
    partialBody: (errors: number) =>
      `${errors} row${errors === 1 ? "" : "s"} couldn’t be imported. Download the report to fix and re-upload those rows.`,
    downloadErrors: "Download rows with errors",
    importAnother: "Import another file",
  },
  history: {
    title: "Recent imports",
    empty: "No imports yet for this store.",
    loading: "Loading…",
    rollback: "Undo import",
    rollbackTitle: "Undo this import?",
    rollbackDescription: (count: number, fileName: string | null) =>
      `This removes ${count} row${count === 1 ? "" : "s"} from "${fileName ?? "this file"}". You can’t undo this action.`,
    rollbackConfirm: "Yes, undo import",
    rollbackCancel: "Keep import",
  },
  template: {
    banner: (name: string) => `You saved a mapping called “${name}” for this file layout.`,
    load: "Use saved mapping",
    dismiss: "Match again",
  },
  error: {
    retry: "Try again",
  },
} as const;

import { parse, isValid } from "date-fns";
import { IMPORT_CONFIG } from "@/lib/import-engine/config";

const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30);
const EXCEL_SERIAL_MIN = 10_000;
const EXCEL_SERIAL_MAX = 50_000;

function parseExcelSerial(value: string): Date | null {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  if (numeric < EXCEL_SERIAL_MIN || numeric > EXCEL_SERIAL_MAX) return null;
  const wholeDays = Math.floor(numeric);
  const fraction = numeric - wholeDays;
  const ms = EXCEL_EPOCH_MS + wholeDays * 86_400_000 + Math.round(fraction * 86_400_000);
  const date = new Date(ms);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toIsoString(date: Date): string {
  return date.toISOString();
}

/** Normalise multi-format date strings to ISO 8601 */
export function parseDate(value: string, acceptedFormats: string[]): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const excelDate = parseExcelSerial(trimmed);
  if (excelDate) return toIsoString(excelDate);

  for (const format of acceptedFormats) {
    const parsed = parse(trimmed, format, new Date());
    if (isValid(parsed)) return toIsoString(parsed);
  }

  const isoParsed = new Date(trimmed);
  if (!Number.isNaN(isoParsed.getTime())) return toIsoString(isoParsed);

  return null;
}

export function parseDurationToSeconds(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const mmSs = /^(\d{1,3}):(\d{2})$/.exec(trimmed);
  if (mmSs) {
    const minutes = Number(mmSs[1]);
    const seconds = Number(mmSs[2]);
    if (seconds >= 60) return null;
    return minutes * 60 + seconds;
  }

  const numeric = Number(trimmed.replace(/[^\d.]/g, ""));
  return Number.isFinite(numeric) ? Math.round(numeric) : null;
}

export function getDefaultCountryCode(): string {
  return IMPORT_CONFIG.phoneCountryCode;
}

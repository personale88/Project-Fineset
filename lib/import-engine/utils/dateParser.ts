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

function parseHumanDurationToMinutes(value: string): number | null {
  const hrMinMatch = value.match(
    /(\d+)\s*(?:hr|hrs|hour|hours|h)\b\s*(\d+)?\s*(?:min|mins|minute|minutes|m)?\b/i,
  );
  if (hrMinMatch) {
    const hours = Number(hrMinMatch[1]);
    const minutes = hrMinMatch[2] ? Number(hrMinMatch[2]) : 0;
    if (Number.isFinite(hours) && Number.isFinite(minutes) && minutes < 60) {
      return hours * 60 + minutes;
    }
  }

  const minOnlyMatch = value.match(/^(\d+(?:\.\d+)?)\s*(?:min|mins|minute|minutes|m)\b/i);
  if (minOnlyMatch) {
    const minutes = Number(minOnlyMatch[1]);
    return Number.isFinite(minutes) ? Math.round(minutes) : null;
  }

  return null;
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

export function parseDurationToMinutes(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const humanDuration = parseHumanDurationToMinutes(trimmed);
  if (humanDuration !== null) return humanDuration;

  const hoursMinutes = /^(\d{1,3}):(\d{2})$/.exec(trimmed);
  if (hoursMinutes) {
    const hours = Number(hoursMinutes[1]);
    const minutes = Number(hoursMinutes[2]);
    if (minutes < 60) return hours * 60 + minutes;
  }

  const numeric = Number(trimmed.replace(/[^\d.]/g, ""));
  return Number.isFinite(numeric) ? Math.round(numeric) : null;
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

  const humanDuration = parseHumanDurationToMinutes(trimmed);
  if (humanDuration !== null) return humanDuration * 60;

  const numeric = Number(trimmed.replace(/[^\d.]/g, ""));
  return Number.isFinite(numeric) ? Math.round(numeric) : null;
}

/** Parse a time-only cell (e.g. 10:30, 10:30 AM, 10.30) to an ISO string. */
export function parseTime(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const dotTime = /^(\d{1,2})\.(\d{2})$/.exec(trimmed);
  if (dotTime) {
    const hours = Number(dotTime[1]);
    const minutes = Number(dotTime[2]);
    if (hours < 24 && minutes < 60) {
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);
      return toIsoString(date);
    }
  }

  const numeric = Number(trimmed);
  if (Number.isFinite(numeric) && numeric >= 0 && numeric < 1) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setSeconds(Math.round(numeric * 86_400));
    return toIsoString(date);
  }

  const timeFormats = ["HH:mm", "H:mm", "hh:mm a", "h:mm a", "HH:mm:ss", "h:mm:ss a"];
  for (const format of timeFormats) {
    const parsed = parse(trimmed, format, new Date());
    if (isValid(parsed)) return toIsoString(parsed);
  }

  return parseDate(trimmed, ["dd/MM/yyyy HH:mm", "MM-dd-yyyy HH:mm", "yyyy-MM-dd HH:mm"]);
}

export function getDefaultCountryCode(): string {
  return IMPORT_CONFIG.phoneCountryCode;
}

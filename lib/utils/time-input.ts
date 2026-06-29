const TIME_INPUT_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const LOOSE_TIME_INPUT_RE = /^(\d{1,2}):(\d{1,2})$/;

export const AUTOMATION_TIME_FORMAT_MESSAGE =
  "Use HH:MM format (24-hour), for example 09:00.";

export function isValidTimeInput(value: string): boolean {
  return TIME_INPUT_RE.test(value);
}

export function normalizeTimeInput(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (isValidTimeInput(trimmed)) return trimmed;

  const match = LOOSE_TIME_INPUT_RE.exec(trimmed);
  if (!match) return null;

  const hours = Number.parseInt(match[1]!, 10);
  const minutes = Number.parseInt(match[2]!, 10);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  const normalized = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  return isValidTimeInput(normalized) ? normalized : null;
}

export function coerceFormTimeValue(value: unknown): Date | undefined {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  return undefined;
}

export function formatTimeForInput(value: Date | string | null | undefined): string {
  const date = coerceFormTimeValue(value);
  if (!date) return "";

  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function parseTimeInput(time: string, baseDate: Date = new Date()): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const result = new Date(baseDate);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

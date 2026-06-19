const CALENDAR_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isCalendarDateString(value: string): boolean {
  return CALENDAR_DATE_RE.test(value);
}

/** Format a Date as YYYY-MM-DD in local time (never UTC-shifted). */
export function formatCalendarDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Parse YYYY-MM-DD as a local calendar date (noon avoids DST edge cases). */
export function parseCalendarDate(value: string): Date {
  if (!isCalendarDateString(value)) {
    throw new Error(`Invalid calendar date: ${value}`);
  }

  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

/** Accept YYYY-MM-DD or ISO datetime strings from API payloads. */
export function coerceCalendarDateInput(value: string | Date): Date {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new Error("Invalid calendar date");
    }
    return parseCalendarDate(formatCalendarDate(value));
  }

  if (isCalendarDateString(value)) {
    return parseCalendarDate(value);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid calendar date: ${value}`);
  }

  return parseCalendarDate(formatCalendarDate(parsed));
}

export function startOfCalendarDay(value: string | Date): Date {
  const date = coerceCalendarDateInput(value);
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function endOfCalendarDay(value: string | Date): Date {
  const date = coerceCalendarDateInput(value);
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

export function compareCalendarDateStrings(a: string, b: string): number {
  return a.localeCompare(b);
}

/** Normalize a date-picker value to noon on its local calendar day (use in the browser). */
export function normalizeCalendarPickerDate(date: Date): Date {
  return parseCalendarDate(formatCalendarDate(date));
}

/** Resolve the calendar day to store from a client-submitted instant (server-side). */
export function resolveCalendarDayFromInstant(date: Date): Date {
  return startOfCalendarDay(parseCalendarDate(formatCalendarDate(date)));
}

export function isSameCalendarDay(a: Date, b: Date): boolean {
  return formatCalendarDate(a) === formatCalendarDate(b);
}

export function applyTimeToCalendarDay(day: Date, time: Date): Date {
  const result = startOfCalendarDay(day);
  result.setHours(time.getHours(), time.getMinutes(), 0, 0);
  return result;
}

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

export function startOfCalendarDay(value: string | Date): Date {
  const date = typeof value === "string" ? parseCalendarDate(value) : new Date(value);
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function endOfCalendarDay(value: string | Date): Date {
  const date = typeof value === "string" ? parseCalendarDate(value) : new Date(value);
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

export function compareCalendarDateStrings(a: string, b: string): number {
  return a.localeCompare(b);
}

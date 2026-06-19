import type { CallAnswerStatus } from "@prisma/client";

export interface OccasionPeriodRange {
  start: Date;
  end: Date;
}

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function isDateInRange(date: Date, range: OccasionPeriodRange): boolean {
  return date >= startOfDay(range.start) && date <= range.end;
}

/** Returns the occasion occurrence in range if staff still needs to call. */
export function missedOccasionDateInRange(
  occasionDate: Date,
  range: OccasionPeriodRange,
  lastCallAnswered: CallAnswerStatus | null | undefined,
): Date | null {
  if (lastCallAnswered === "ANSWERED") return null;

  const years = new Set([range.start.getFullYear(), range.end.getFullYear()]);

  for (const year of years) {
    const occurrence = new Date(
      year,
      occasionDate.getUTCMonth(),
      occasionDate.getUTCDate(),
      12,
      0,
      0,
      0,
    );

    if (!isDateInRange(occurrence, range)) continue;
    if (occurrence > range.end) continue;

    return occurrence;
  }

  return null;
}

export function currentMonthOccasionRange(now = new Date()): OccasionPeriodRange {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export function occasionStillNeedsCall(
  occasionDate: Date | null | undefined,
  lastCallAnswered: CallAnswerStatus | null | undefined,
  range = currentMonthOccasionRange(),
): boolean {
  if (!occasionDate) return false;
  return missedOccasionDateInRange(occasionDate, range, lastCallAnswered) !== null;
}

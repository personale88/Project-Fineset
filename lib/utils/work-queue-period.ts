import type { AnalyticsPeriodLabel } from "@/types";
import { startOfCalendarDay } from "@/lib/utils/calendar-date";
import {
  isDueTodayFollowUpDate,
  isOverdueFollowUpDate,
} from "@/lib/utils/follow-up-status";
import { getPeriodRange } from "@/lib/utils/analytics";

function isCalendarDayInRange(day: string | Date, start: Date, end: Date): boolean {
  const normalized = startOfCalendarDay(day);
  return normalized >= startOfCalendarDay(start) && normalized <= startOfCalendarDay(end);
}

export function isFollowUpInWorkQueuePeriod(
  followUpDate: string,
  period: AnalyticsPeriodLabel,
): boolean {
  if (period === "today") {
    return (
      isOverdueFollowUpDate(followUpDate) || isDueTodayFollowUpDate(followUpDate)
    );
  }

  const { start, end } = getPeriodRange(period);
  return isCalendarDayInRange(followUpDate, start, end);
}

export function isCallVisitInWorkQueuePeriod(
  visitDate: string,
  period: AnalyticsPeriodLabel,
): boolean {
  const { start, end } = getPeriodRange(period);
  return isCalendarDayInRange(visitDate, start, end);
}

export function shouldIncludeOccasionCalls(period: AnalyticsPeriodLabel): boolean {
  return period === "today" || period === "week" || period === "month";
}

export function getMonthsInWorkQueuePeriod(
  period: AnalyticsPeriodLabel,
): Array<{ year: number; month: number }> {
  const { start, end } = getPeriodRange(period);
  const months: Array<{ year: number; month: number }> = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);

  while (cursor <= endMonth) {
    months.push({ year: cursor.getFullYear(), month: cursor.getMonth() + 1 });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return months;
}

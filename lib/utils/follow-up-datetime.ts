import {
  applyTimeToCalendarDay,
  startOfCalendarDay,
} from "@/lib/utils/calendar-date";
import { formatDate, formatDateTime } from "@/lib/utils/formatters";
import {
  formatTimeForInput,
  isValidTimeInput,
  parseTimeInput,
} from "@/lib/utils/time-input";

export function normalizeStoredFollowUpDate(date: Date): Date {
  const day = startOfCalendarDay(date);
  if (
    date.getHours() === 0 &&
    date.getMinutes() === 0 &&
    date.getSeconds() === 0 &&
    date.getMilliseconds() === 0
  ) {
    return day;
  }

  return applyTimeToCalendarDay(day, date);
}

export function resolveFollowUpDateTime(
  date: Date,
  preferredTime?: string | null,
): Date {
  const day = startOfCalendarDay(date);
  if (!preferredTime || !isValidTimeInput(preferredTime)) {
    return day;
  }

  return parseTimeInput(preferredTime, day);
}

export function extractPreferredTime(date: Date | string): string {
  const parsed = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(parsed.getTime())) return "";
  if (parsed.getHours() === 0 && parsed.getMinutes() === 0) return "";
  return formatTimeForInput(parsed);
}

export function hasFollowUpPreferredTime(date: Date | string): boolean {
  return extractPreferredTime(date).length > 0;
}

export function formatFollowUpSchedule(date: Date | string): string {
  const parsed = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(parsed.getTime())) return formatDate(date);
  if (hasFollowUpPreferredTime(parsed)) return formatDateTime(parsed);
  return formatDate(parsed);
}

export function buildFollowUpSubmitPayload<
  T extends {
    followUpNeeded?: boolean;
    followUpDate?: Date;
    followUpPreferredTime?: string;
  },
>(values: T): Omit<T, "followUpPreferredTime"> {
  const { followUpPreferredTime, ...rest } = values;
  if (!rest.followUpNeeded || !rest.followUpDate) {
    return rest;
  }

  return {
    ...rest,
    followUpDate: resolveFollowUpDateTime(rest.followUpDate, followUpPreferredTime),
  };
}

import type { AdminBusinessAnalyticsQuery } from "@/lib/validations/admin-business-analytics.schema";
import { getPeriodRange } from "@/lib/utils/analytics";
import type { AnalyticsPeriodLabel } from "@/types";

export type AnalyticsDateMode = NonNullable<AdminBusinessAnalyticsQuery["dateMode"]>;

export interface ResolvedDateRange {
  start: Date;
  end: Date;
  label: string;
}

export type ResolvedAnalyticsDates =
  | { kind: "single"; range: ResolvedDateRange }
  | {
      kind: "compare";
      rangeA: ResolvedDateRange;
      rangeB: ResolvedDateRange;
    };

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export function formatMonthYearLabel(month: number, year: number): string {
  const name = MONTH_NAMES[month - 1] ?? `Month ${month}`;
  return `${name} ${year}`;
}

export function getCalendarMonthRange(month: number, year: number): ResolvedDateRange {
  const start = new Date(year, month - 1, 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(year, month, 0);
  end.setHours(23, 59, 59, 999);
  return {
    start,
    end,
    label: formatMonthYearLabel(month, year),
  };
}

function getSingleDayRange(date: Date): ResolvedDateRange {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  const label = start.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return { start, end, label };
}

function getCustomRange(startDate: Date, endDate: Date): ResolvedDateRange {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  const sameDay = start.toDateString() === end.toDateString();
  const label = sameDay
    ? start.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : `${start.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} – ${end.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;
  return { start, end, label };
}

function formatDateRangeLabel(start: Date, end: Date): string {
  const sameDay = start.toDateString() === end.toDateString();
  if (sameDay) {
    return start.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }
  return `${start.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} – ${end.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;
}

const MAX_ROLLING_MONTHS = 24;
const MAX_ROLLING_DAYS = 366;

export function clampRollingMonths(months: number): number {
  return Math.min(MAX_ROLLING_MONTHS, Math.max(1, Math.round(months)));
}

export function clampRollingDays(days: number): number {
  return Math.min(MAX_ROLLING_DAYS, Math.max(1, Math.round(days)));
}

/** Calendar-month window: 1st of (N-1) months ago through end of reference day. */
export function getRollingMonthsRange(
  months: number,
  referenceDate: Date = new Date(),
): ResolvedDateRange {
  const count = clampRollingMonths(months);
  const end = new Date(referenceDate);
  end.setHours(23, 59, 59, 999);
  const start = new Date(referenceDate);
  start.setHours(0, 0, 0, 0);
  start.setMonth(start.getMonth() - (count - 1));
  start.setDate(1);
  const rangeLabel = formatDateRangeLabel(start, end);
  return {
    start,
    end,
    label: `Last ${count} month${count === 1 ? "" : "s"} (${rangeLabel})`,
  };
}

/** Inclusive rolling day window ending on the reference day. */
export function getRollingDaysRange(
  days: number,
  referenceDate: Date = new Date(),
): ResolvedDateRange {
  const count = clampRollingDays(days);
  const end = new Date(referenceDate);
  end.setHours(23, 59, 59, 999);
  const start = new Date(referenceDate);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (count - 1));
  const rangeLabel = formatDateRangeLabel(start, end);
  return {
    start,
    end,
    label: `Last ${count} day${count === 1 ? "" : "s"} (${rangeLabel})`,
  };
}

export function formatPresetPeriodLabel(
  period: AnalyticsPeriodLabel,
  start: Date,
  end: Date,
): string {
  const rangeLabel = formatDateRangeLabel(start, end);
  switch (period) {
    case "today":
      return `Today (${rangeLabel})`;
    case "yesterday":
      return `Yesterday (${rangeLabel})`;
    case "week":
      return `Last 7 days (${rangeLabel})`;
    case "month":
      return `This month (${rangeLabel})`;
    case "last30days":
      return `Last 30 days (${rangeLabel})`;
    case "last3months":
      return `Last 90 days (${rangeLabel})`;
    case "last6months":
      return `Last 6 months (${rangeLabel})`;
    default:
      return rangeLabel;
  }
}

export function resolveAnalyticsDates(
  query: AdminBusinessAnalyticsQuery,
): ResolvedAnalyticsDates {
  const mode = query.dateMode ?? (query.startDate && query.endDate ? "range" : "preset");

  if (mode === "compare") {
    if (
      !query.compareAMonth ||
      !query.compareAYear ||
      !query.compareBMonth ||
      !query.compareBYear
    ) {
      throw new Error("Compare mode requires both period month and year values");
    }
    return {
      kind: "compare",
      rangeA: getCalendarMonthRange(query.compareAMonth, query.compareAYear),
      rangeB: getCalendarMonthRange(query.compareBMonth, query.compareBYear),
    };
  }

  if (mode === "month") {
    if (!query.month || !query.year) {
      throw new Error("Month mode requires month and year");
    }
    return { kind: "single", range: getCalendarMonthRange(query.month, query.year) };
  }

  if (mode === "day") {
    if (!query.startDate) {
      throw new Error("Day mode requires startDate");
    }
    return { kind: "single", range: getSingleDayRange(query.startDate) };
  }

  if (mode === "range" && query.startDate && query.endDate) {
    return { kind: "single", range: getCustomRange(query.startDate, query.endDate) };
  }

  if (query.rollingMonths) {
    return { kind: "single", range: getRollingMonthsRange(query.rollingMonths) };
  }

  if (query.rollingDays) {
    return { kind: "single", range: getRollingDaysRange(query.rollingDays) };
  }

  const period = query.period ?? "last30days";
  const { start, end } = getPeriodRange(period);
  return {
    kind: "single",
    range: { start, end, label: formatPresetPeriodLabel(period, start, end) },
  };
}

export function percentDelta(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

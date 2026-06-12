import type { AdminBusinessAnalyticsQuery } from "@/lib/validations/admin-business-analytics.schema";
import { getPeriodRange } from "@/lib/utils/analytics";

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

  const period = query.period ?? "month";
  const { start, end } = getPeriodRange(period);
  const label =
    period === "today"
      ? "Today"
      : period === "yesterday"
        ? "Yesterday"
        : period === "week"
          ? "Last 7 days"
          : period === "month"
            ? "Last 30 days"
            : period === "last3months"
              ? "Last 90 days"
              : "Last 6 months";
  return { kind: "single", range: { start, end, label } };
}

export function percentDelta(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

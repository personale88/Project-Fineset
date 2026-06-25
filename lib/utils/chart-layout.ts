export const CHART_GRID_CLASS = "grid gap-4 lg:grid-cols-2 [&>*]:min-w-0";

export const CHART_CARD_CLASS = "min-w-0 overflow-hidden border-border bg-surface-secondary/30";

export const CHART_CARD_HEADER_CLASS = "space-y-1.5 px-4 pb-2 pt-4 sm:px-6 sm:pt-6";

export const CHART_CARD_CONTENT_CLASS = "overflow-hidden px-4 pt-0 sm:px-6";

export const VERTICAL_BAR_CHART_MARGIN = {
  top: 4,
  right: 12,
  left: 0,
  bottom: 4,
} as const;

export const TIME_SERIES_CHART_MARGIN = {
  top: 8,
  right: 12,
  left: 0,
  bottom: 0,
} as const;

export function truncateChartLabel(label: string, maxLength = 14): string {
  if (label.length <= maxLength) return label;
  return `${label.slice(0, maxLength - 1)}…`;
}

export function formatChartDateTick(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
  }).format(date);
}

export interface TrendChartPoint {
  date: string;
  visits: number;
  revenue: number;
}

/** Buckets dense daily series so long ranges stay readable (no dot clutter). */
export function downsampleTrendForChart(
  data: TrendChartPoint[],
  maxPoints = 60,
): TrendChartPoint[] {
  if (data.length <= maxPoints) return data;

  const bucketSize = Math.ceil(data.length / maxPoints);
  const buckets: TrendChartPoint[] = [];

  for (let i = 0; i < data.length; i += bucketSize) {
    const slice = data.slice(i, i + bucketSize);
    const anchor = slice[slice.length - 1]!;
    buckets.push({
      date: anchor.date,
      visits: slice.reduce((sum, point) => sum + point.visits, 0),
      revenue: slice.reduce((sum, point) => sum + point.revenue, 0),
    });
  }

  return buckets;
}

export const TABS_LIST_SCROLL_CLASS =
  "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

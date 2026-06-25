"use client";

import { useId, useMemo } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { AnalyticsChartShell } from "@/components/admin/analytics/AnalyticsChartShell";
import {
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart";
import { CHART_COLORS } from "@/lib/charts/theme";
import {
  downsampleTrendForChart,
  formatChartDateTick,
  TIME_SERIES_CHART_MARGIN,
  type TrendChartPoint,
} from "@/lib/utils/chart-layout";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import { NUMERIC_FONT_FAMILY } from "@/lib/utils/typography";

interface AnalyticsTrendChartProps {
  title: string;
  description?: string;
  data: TrendChartPoint[];
  revenueLabel: string;
}

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: CHART_COLORS.primary,
  },
};

export function AnalyticsTrendChart({
  title,
  description,
  data,
  revenueLabel,
}: AnalyticsTrendChartProps) {
  const gradientId = useId().replace(/:/g, "");
  const chartData = useMemo(() => downsampleTrendForChart(data), [data]);
  const isDownsampled = chartData.length < data.length;
  const hint =
    description ??
    (isDownsampled ? "Weekly totals for a clearer long-range view." : undefined);

  return (
    <AnalyticsChartShell title={title} description={hint}>
      <ChartContainer config={chartConfig} className="h-[280px] w-full">
        <AreaChart data={chartData} margin={TIME_SERIES_CHART_MARGIN}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            fontSize={11}
            fontFamily={NUMERIC_FONT_FAMILY}
            tickFormatter={formatChartDateTick}
            interval="preserveStartEnd"
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={72}
            fontSize={11}
            fontFamily={NUMERIC_FONT_FAMILY}
            tickFormatter={(value: number) => formatCurrency(value)}
          />
          <ChartTooltip content={<RevenueTrendTooltip revenueLabel={revenueLabel} />} />
          <Area
            type="monotone"
            dataKey="revenue"
            name={revenueLabel}
            stroke="var(--color-revenue)"
            fill={`url(#${gradientId})`}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </AreaChart>
      </ChartContainer>
    </AnalyticsChartShell>
  );
}

function RevenueTrendTooltip({
  active,
  payload,
  label,
  revenueLabel,
}: {
  active?: boolean;
  payload?: Array<{ payload?: TrendChartPoint }>;
  label?: string;
  revenueLabel: string;
}) {
  if (!active || !payload?.length) return null;

  const row = payload[0]?.payload;
  if (!row) return null;

  return (
    <div className="grid min-w-[10rem] gap-1.5 rounded-lg border border-border bg-surface-card px-2.5 py-1.5 text-xs shadow-card">
      <p className="font-medium text-text-primary">{formatDate(String(label))}</p>
      <div className="flex items-center justify-between gap-3">
        <span className="text-text-secondary">{revenueLabel}</span>
        <span className="font-numeric font-medium text-text-primary">
          {formatCurrency(row.revenue)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-text-secondary">Visits</span>
        <span className="font-numeric font-medium text-text-primary">
          {row.visits.toLocaleString("en-IN")}
        </span>
      </div>
    </div>
  );
}

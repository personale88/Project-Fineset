"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { AnalyticsChartShell } from "@/components/admin/analytics/AnalyticsChartShell";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { getChartSeriesColor } from "@/lib/charts/theme";
import { TIME_SERIES_CHART_MARGIN } from "@/lib/utils/chart-layout";
import { NUMERIC_FONT_FAMILY } from "@/lib/utils/typography";
import type { BreakdownRow } from "@/types/admin-business-analytics";

const MAX_STACK_SLICES = 7;

interface AnalyticsStackedBreakdownChartProps {
  title: string;
  description?: string;
  periodLabel: string;
  data: BreakdownRow[];
  emptyMessage: string;
}

export function AnalyticsStackedBreakdownChart({
  title,
  description,
  periodLabel,
  data,
  emptyMessage,
}: AnalyticsStackedBreakdownChartProps) {
  const slices = data.slice(0, MAX_STACK_SLICES);
  if (slices.length === 0) {
    return (
      <AnalyticsChartShell title={title} description={description}>
        <p className="text-sm text-text-muted">{emptyMessage}</p>
      </AnalyticsChartShell>
    );
  }

  const row: Record<string, string | number> = { label: periodLabel };
  const config: Record<string, { label: string; color: string }> = {};

  for (const [index, slice] of slices.entries()) {
    const key = `s${index}`;
    row[key] = slice.count;
    config[key] = { label: slice.label, color: getChartSeriesColor(index) };
  }

  return (
    <AnalyticsChartShell title={title} description={description}>
      <ChartContainer config={config} className="h-[280px] w-full">
        <BarChart data={[row]} margin={TIME_SERIES_CHART_MARGIN}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            fontSize={11}
            fontFamily={NUMERIC_FONT_FAMILY}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={56}
            fontSize={11}
            fontFamily={NUMERIC_FONT_FAMILY}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          {slices.map((slice, index) => (
            <Bar
              key={slice.label}
              dataKey={`s${index}`}
              name={slice.label}
              stackId="types"
              fill={getChartSeriesColor(index)}
              radius={index === slices.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
              maxBarSize={48}
            />
          ))}
        </BarChart>
      </ChartContainer>
    </AnalyticsChartShell>
  );
}

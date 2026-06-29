"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import { AnalyticsChartShell } from "@/components/admin/analytics/AnalyticsChartShell";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { getChartSeriesColor } from "@/lib/charts/theme";
import {
  truncateChartLabel,
  VERTICAL_BAR_CHART_MARGIN,
} from "@/lib/utils/chart-layout";
import { NUMERIC_FONT_FAMILY } from "@/lib/utils/typography";
import type { BreakdownRow } from "@/types/admin-business-analytics";

const TOP_N = 10;

interface AnalyticsRankedBarChartProps {
  title: string;
  description?: string;
  data: BreakdownRow[];
  emptyMessage: string;
}

export function AnalyticsRankedBarChart({
  title,
  description,
  data,
  emptyMessage,
}: AnalyticsRankedBarChartProps) {
  const chartData = useMemo(
    () =>
      [...data]
        .sort((a, b) => b.count - a.count)
        .slice(0, TOP_N)
        .map((row, index) => ({
          name: row.label,
          count: row.count,
          fill: getChartSeriesColor(index),
        })),
    [data],
  );

  const config = Object.fromEntries(
    chartData.map((row) => [row.name, { label: row.name, color: row.fill }]),
  );

  return (
    <AnalyticsChartShell title={title} description={description}>
      {chartData.length === 0 ? (
        <p className="text-sm text-text-muted">{emptyMessage}</p>
      ) : (
        <ChartContainer config={config} className="h-[280px] w-full">
          <BarChart data={chartData} layout="vertical" margin={VERTICAL_BAR_CHART_MARGIN}>
            <CartesianGrid horizontal={false} strokeDasharray="3 3" />
            <XAxis
              type="number"
              tickLine={false}
              axisLine={false}
              fontSize={11}
              fontFamily={NUMERIC_FONT_FAMILY}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={108}
              tickLine={false}
              axisLine={false}
              fontSize={11}
              tickFormatter={(value: string) => truncateChartLabel(value, 14)}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={28}>
              {chartData.map((row) => (
                <Cell key={row.name} fill={row.fill} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      )}
    </AnalyticsChartShell>
  );
}

"use client";

import { Cell, Pie, PieChart } from "recharts";
import { AnalyticsChartShell } from "@/components/admin/analytics/AnalyticsChartShell";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { getChartSeriesColor } from "@/lib/charts/theme";
import type { BreakdownRow } from "@/types/admin-business-analytics";

interface AnalyticsPieChartProps {
  title: string;
  description?: string;
  data: BreakdownRow[];
  emptyMessage: string;
  metric?: "visits" | "revenue";
  revenueLabel?: string;
}

export function AnalyticsPieChart({
  title,
  description,
  data,
  emptyMessage,
  metric = "visits",
  revenueLabel = "Revenue",
}: AnalyticsPieChartProps) {
  if (data.length === 0) {
    return (
      <AnalyticsChartShell title={title} description={description}>
        <p className="text-sm text-text-muted">{emptyMessage}</p>
      </AnalyticsChartShell>
    );
  }

  const pieData = data.map((row, index) => ({
    name: row.label,
    value: metric === "revenue" ? (row.revenue ?? 0) : row.count,
    fill: getChartSeriesColor(index),
  }));

  const config = Object.fromEntries(
    pieData.map((row) => [row.name, { label: row.name, color: row.fill }]),
  );

  return (
    <AnalyticsChartShell title={title} description={description}>
      <ChartContainer config={config} className="mx-auto h-[280px] w-full">
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent />} />
          <Pie
            data={pieData}
            dataKey="value"
            nameKey="name"
            innerRadius={58}
            outerRadius={88}
            paddingAngle={3}
            stroke="var(--surface-card)"
            strokeWidth={2}
          >
            {pieData.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Pie>
          <ChartLegend content={<ChartLegendContent />} />
        </PieChart>
      </ChartContainer>
    </AnalyticsChartShell>
  );
}

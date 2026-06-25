"use client";

import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from "recharts";
import { AnalyticsChartShell } from "@/components/admin/analytics/AnalyticsChartShell";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { CHART_COLORS } from "@/lib/charts/theme";
import type { AnalyticsAskRadarPoint } from "@/types/admin-business-analytics-ask";

interface AnalyticsRadarChartProps {
  title: string;
  description?: string;
  data: AnalyticsAskRadarPoint[];
  emptyMessage: string;
}

const chartConfig = {
  value: {
    label: "Score",
    color: CHART_COLORS.secondary,
  },
};

export function AnalyticsRadarChart({
  title,
  description,
  data,
  emptyMessage,
}: AnalyticsRadarChartProps) {
  if (data.length === 0) {
    return (
      <AnalyticsChartShell title={title} description={description}>
        <p className="text-sm text-text-muted">{emptyMessage}</p>
      </AnalyticsChartShell>
    );
  }

  return (
    <AnalyticsChartShell title={title} description={description}>
      <ChartContainer config={chartConfig} className="mx-auto h-[280px] w-full max-w-md">
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="72%">
          <PolarGrid stroke="var(--border)" strokeOpacity={0.55} />
          <PolarAngleAxis
            dataKey="label"
            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Radar
            name="Score"
            dataKey="value"
            stroke="var(--color-value)"
            fill="var(--color-value)"
            fillOpacity={0.22}
            strokeWidth={2}
            dot={false}
          />
        </RadarChart>
      </ChartContainer>
    </AnalyticsChartShell>
  );
}

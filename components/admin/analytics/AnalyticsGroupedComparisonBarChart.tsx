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
import { CHART_COMPARE } from "@/lib/charts/theme";
import { TIME_SERIES_CHART_MARGIN } from "@/lib/utils/chart-layout";
import { formatCurrency } from "@/lib/utils/formatters";
import { NUMERIC_FONT_FAMILY } from "@/lib/utils/typography";
import type { ComparisonTrendPoint } from "@/types/admin-business-analytics";
import type { AskChartMetric } from "@/lib/analytics/ask-chart-scenarios";

interface AnalyticsGroupedComparisonBarChartProps {
  title: string;
  description?: string;
  periodALabel: string;
  periodBLabel: string;
  data: ComparisonTrendPoint[];
  metric: AskChartMetric;
}

export function AnalyticsGroupedComparisonBarChart({
  title,
  description,
  periodALabel,
  periodBLabel,
  data,
  metric,
}: AnalyticsGroupedComparisonBarChartProps) {
  const chartData = data.map((row) => ({
    label: row.label,
    periodA: metric === "revenue" ? row.periodA.revenue : row.periodA.visits,
    periodB: metric === "revenue" ? row.periodB.revenue : row.periodB.visits,
  }));

  const chartConfig = {
    periodA: { label: periodALabel, color: CHART_COMPARE.current },
    periodB: { label: periodBLabel, color: CHART_COMPARE.prior },
  };

  const formatValue = (value: number) =>
    metric === "revenue" ? formatCurrency(value) : value.toLocaleString("en-IN");

  return (
    <AnalyticsChartShell title={title} description={description}>
      <ChartContainer config={chartConfig} className="h-[280px] w-full">
        <BarChart data={chartData} margin={TIME_SERIES_CHART_MARGIN}>
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
            width={72}
            fontSize={11}
            fontFamily={NUMERIC_FONT_FAMILY}
            tickFormatter={(value: number) =>
              metric === "revenue" ? formatCurrency(value) : String(value)
            }
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value) => formatValue(Number(value))}
              />
            }
          />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar
            dataKey="periodA"
            name={periodALabel}
            fill="var(--color-periodA)"
            radius={[4, 4, 0, 0]}
            maxBarSize={32}
          />
          <Bar
            dataKey="periodB"
            name={periodBLabel}
            fill="var(--color-periodB)"
            radius={[4, 4, 0, 0]}
            maxBarSize={32}
          />
        </BarChart>
      </ChartContainer>
    </AnalyticsChartShell>
  );
}

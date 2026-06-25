"use client";

import { CartesianGrid, Legend, Line, LineChart, XAxis, YAxis } from "recharts";
import { AnalyticsChartShell } from "@/components/admin/analytics/AnalyticsChartShell";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
} from "@/components/ui/chart";
import { CHART_COMPARE } from "@/lib/charts/theme";
import { TIME_SERIES_CHART_MARGIN } from "@/lib/utils/chart-layout";
import { formatCurrency } from "@/lib/utils/formatters";
import { NUMERIC_FONT_FAMILY } from "@/lib/utils/typography";
import type { ComparisonTrendPoint } from "@/types/admin-business-analytics";

interface AnalyticsComparisonTrendChartProps {
  title: string;
  periodALabel: string;
  periodBLabel: string;
  revenueLabel: string;
  data: ComparisonTrendPoint[];
}

export function AnalyticsComparisonTrendChart({
  title,
  periodALabel,
  periodBLabel,
  revenueLabel,
  data,
}: AnalyticsComparisonTrendChartProps) {
  const chartData = data.map((row) => ({
    label: row.label,
    periodARevenue: row.periodA.revenue,
    periodBRevenue: row.periodB.revenue,
  }));

  const chartConfig = {
    periodARevenue: {
      label: periodALabel,
      color: CHART_COMPARE.current,
    },
    periodBRevenue: {
      label: periodBLabel,
      color: CHART_COMPARE.prior,
    },
  };

  return (
    <AnalyticsChartShell title={title} description={revenueLabel}>
      <ChartContainer config={chartConfig} className="h-[280px] w-full">
        <LineChart data={chartData} margin={TIME_SERIES_CHART_MARGIN}>
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
            tickFormatter={(value: number) => formatCurrency(value)}
          />
          <ChartTooltip
            content={
              <ComparisonTrendTooltip
                periodALabel={periodALabel}
                periodBLabel={periodBLabel}
              />
            }
          />
          <ChartLegend content={<ChartLegendContent />} />
          <Line
            type="monotone"
            dataKey="periodARevenue"
            name={periodALabel}
            stroke="var(--color-periodARevenue)"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
          <Line
            type="monotone"
            dataKey="periodBRevenue"
            name={periodBLabel}
            stroke="var(--color-periodBRevenue)"
            strokeWidth={2.5}
            strokeDasharray="6 4"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </LineChart>
      </ChartContainer>
    </AnalyticsChartShell>
  );
}

function ComparisonTrendTooltip({
  active,
  payload,
  label,
  periodALabel,
  periodBLabel,
}: {
  active?: boolean;
  payload?: Array<{ dataKey?: string; value?: number; color?: string }>;
  label?: string;
  periodALabel: string;
  periodBLabel: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="grid min-w-[11rem] gap-1.5 rounded-lg border border-border bg-surface-card px-2.5 py-1.5 text-xs shadow-card">
      <p className="font-medium text-text-primary">Day {label}</p>
      {payload.map((item) => {
        const isA = item.dataKey === "periodARevenue";
        const periodLabel = isA ? periodALabel : periodBLabel;
        return (
          <div key={String(item.dataKey)} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-text-secondary">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: item.color }}
                aria-hidden
              />
              <span className="truncate">{periodLabel}</span>
            </span>
            <span className="font-numeric font-medium text-text-primary">
              {formatCurrency(Number(item.value ?? 0))}
            </span>
          </div>
        );
      })}
    </div>
  );
}

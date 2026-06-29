"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { AnalyticsChartShell } from "@/components/admin/analytics/AnalyticsChartShell";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
} from "@/components/ui/chart";
import type { AskChartMetric } from "@/lib/analytics/ask-chart-scenarios";
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
  metric?: AskChartMetric;
}

export function AnalyticsComparisonTrendChart({
  title,
  periodALabel,
  periodBLabel,
  revenueLabel,
  data,
  metric = "revenue",
}: AnalyticsComparisonTrendChartProps) {
  const periodAKey = metric === "revenue" ? "periodARevenue" : "periodAVisits";
  const periodBKey = metric === "revenue" ? "periodBRevenue" : "periodBVisits";

  const chartData = data.map((row) => ({
    label: row.label,
    periodARevenue: row.periodA.revenue,
    periodBRevenue: row.periodB.revenue,
    periodAVisits: row.periodA.visits,
    periodBVisits: row.periodB.visits,
  }));

  const chartConfig = {
    [periodAKey]: {
      label: periodALabel,
      color: CHART_COMPARE.current,
    },
    [periodBKey]: {
      label: periodBLabel,
      color: CHART_COMPARE.prior,
    },
  };

  const formatValue = (value: number) =>
    metric === "revenue" ? formatCurrency(value) : value.toLocaleString("en-IN");

  return (
    <AnalyticsChartShell
      title={title}
      description={metric === "revenue" ? revenueLabel : "Visits by day"}
    >
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
            tickFormatter={(value: number) =>
              metric === "revenue" ? formatCurrency(value) : String(value)
            }
          />
          <ChartTooltip
            content={
              <ComparisonTrendTooltip
                periodALabel={periodALabel}
                periodBLabel={periodBLabel}
                periodAKey={periodAKey}
                periodBKey={periodBKey}
                formatValue={formatValue}
              />
            }
          />
          <ChartLegend content={<ChartLegendContent />} />
          <Line
            type="monotone"
            dataKey={periodAKey}
            name={periodALabel}
            stroke={`var(--color-${periodAKey})`}
            strokeWidth={2.5}
            dot={{ r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, strokeWidth: 0 }}
          />
          <Line
            type="monotone"
            dataKey={periodBKey}
            name={periodBLabel}
            stroke={`var(--color-${periodBKey})`}
            strokeWidth={2.5}
            strokeDasharray="6 4"
            dot={{ r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, strokeWidth: 0 }}
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
  periodAKey,
  periodBKey,
  formatValue,
}: {
  active?: boolean;
  payload?: Array<{ dataKey?: string; value?: number; color?: string }>;
  label?: string;
  periodALabel: string;
  periodBLabel: string;
  periodAKey: string;
  periodBKey: string;
  formatValue: (value: number) => string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="grid min-w-[11rem] gap-1.5 rounded-lg border border-border bg-surface-card px-2.5 py-1.5 text-xs shadow-card">
      <p className="font-medium text-text-primary">Day {label}</p>
      {payload.map((item) => {
        const isA = item.dataKey === periodAKey;
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
              {formatValue(Number(item.value ?? 0))}
            </span>
          </div>
        );
      })}
    </div>
  );
}

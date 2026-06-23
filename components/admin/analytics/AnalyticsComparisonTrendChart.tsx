"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartCard } from "@/components/shared/ChartCard";
import {
  CHART_COLORS,
  CHART_COMPARE,
  CHART_LEGEND_STYLE,
  CHART_TOOLTIP_CONTENT_STYLE,
  CHART_TOOLTIP_ITEM_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
} from "@/lib/charts/theme";
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

  return (
    <ChartCard title={title}>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
            <XAxis
              dataKey="label"
              stroke={CHART_COLORS.axis}
              tick={{ fill: CHART_COLORS.axis, fontSize: 12 }}
              fontFamily={NUMERIC_FONT_FAMILY}
              tickLine={false}
              axisLine={{ stroke: CHART_COLORS.grid }}
              label={{ value: "Calendar day", position: "insideBottom", offset: -4, fill: CHART_COLORS.axis }}
            />
            <YAxis
              tickFormatter={(value: number) => formatCurrency(value)}
              stroke={CHART_COLORS.axis}
              tick={{ fill: CHART_COLORS.axis, fontSize: 12 }}
              width={72}
              fontFamily={NUMERIC_FONT_FAMILY}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              formatter={(value: number, name: string) => [
                formatCurrency(value),
                name === "periodARevenue" ? periodALabel : periodBLabel,
              ]}
              labelFormatter={(label: string) => `Day ${label}`}
              contentStyle={{
                ...CHART_TOOLTIP_CONTENT_STYLE,
                fontFamily: NUMERIC_FONT_FAMILY,
              }}
              labelStyle={CHART_TOOLTIP_LABEL_STYLE}
              itemStyle={CHART_TOOLTIP_ITEM_STYLE}
            />
            <Legend
              wrapperStyle={CHART_LEGEND_STYLE}
              iconType="line"
              iconSize={14}
            />
            <Line
              type="monotone"
              dataKey="periodARevenue"
              name={periodALabel}
              stroke={CHART_COMPARE.current}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="periodBRevenue"
              name={periodBLabel}
              stroke={CHART_COMPARE.prior}
              strokeWidth={2.5}
              strokeDasharray="6 4"
              dot={false}
              activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-text-muted">{revenueLabel}</p>
    </ChartCard>
  );
}

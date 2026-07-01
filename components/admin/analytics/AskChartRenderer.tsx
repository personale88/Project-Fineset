"use client";

import { AnalyticsBreakdownChart } from "@/components/admin/analytics/AnalyticsBreakdownChart";
import { AnalyticsComparisonTrendChart } from "@/components/admin/analytics/AnalyticsComparisonTrendChart";
import { AnalyticsGroupedComparisonBarChart } from "@/components/admin/analytics/AnalyticsGroupedComparisonBarChart";
import { AnalyticsPieChart } from "@/components/admin/analytics/AnalyticsPieChart";
import { AnalyticsRadarChart } from "@/components/admin/analytics/AnalyticsRadarChart";
import { AnalyticsRankedBarChart } from "@/components/admin/analytics/AnalyticsRankedBarChart";
import { AnalyticsStackedBreakdownChart } from "@/components/admin/analytics/AnalyticsStackedBreakdownChart";
import { AnalyticsTrendChart } from "@/components/admin/analytics/AnalyticsTrendChart";
import type { AnalyticsAskChart } from "@/types/admin-business-analytics-ask";

export interface AskChartRendererProps {
  charts: AnalyticsAskChart[];
  revenueLabel: string;
  emptyBreakdown: string;
}

export function AskChartRenderer({
  charts,
  revenueLabel,
  emptyBreakdown,
}: AskChartRendererProps) {
  if (charts.length === 0) return null;

  return (
    <div className="grid gap-4 sm:gap-6 xl:grid-cols-2">
      {charts.map((chart, index) => {
        const key = `${chart.type}-${index}`;
        switch (chart.type) {
          case "area":
          case "line":
            return (
              <AnalyticsTrendChart
                key={key}
                title={chart.title}
                description={chart.description}
                data={chart.trend ?? []}
                revenueLabel={revenueLabel}
                metric={chart.metric ?? "revenue"}
              />
            );
          case "groupedBar":
            return chart.comparison && chart.periodALabel && chart.periodBLabel ? (
              <AnalyticsGroupedComparisonBarChart
                key={key}
                title={chart.title}
                description={chart.description}
                periodALabel={chart.periodALabel}
                periodBLabel={chart.periodBLabel}
                data={chart.comparison}
                metric={chart.metric ?? "visits"}
              />
            ) : null;
          case "comparison":
            return chart.comparison && chart.periodALabel && chart.periodBLabel ? (
              <AnalyticsComparisonTrendChart
                key={key}
                title={chart.title}
                periodALabel={chart.periodALabel}
                periodBLabel={chart.periodBLabel}
                revenueLabel={revenueLabel}
                data={chart.comparison}
                metric={chart.metric ?? "revenue"}
              />
            ) : null;
          case "rankedBar":
            return (
              <AnalyticsRankedBarChart
                key={key}
                title={chart.title}
                description={chart.description}
                data={chart.breakdown ?? []}
                emptyMessage={emptyBreakdown}
              />
            );
          case "stackedBar":
            return (
              <AnalyticsStackedBreakdownChart
                key={key}
                title={chart.title}
                description={chart.description}
                periodLabel={chart.periodLabel ?? ""}
                data={chart.breakdown ?? []}
                emptyMessage={emptyBreakdown}
              />
            );
          case "bar":
            return (
              <AnalyticsBreakdownChart
                key={key}
                title={chart.title}
                description={chart.description}
                data={chart.breakdown ?? []}
                emptyMessage={emptyBreakdown}
              />
            );
          case "pie":
            return (
              <AnalyticsPieChart
                key={key}
                title={chart.title}
                description={chart.description}
                data={chart.breakdown ?? []}
                metric={chart.metric ?? "visits"}
                revenueLabel={revenueLabel}
                emptyMessage={emptyBreakdown}
              />
            );
          case "radar":
            return (
              <AnalyticsRadarChart
                key={key}
                title={chart.title}
                description={chart.description}
                data={chart.radar ?? []}
                emptyMessage={emptyBreakdown}
              />
            );
          default:
            return null;
        }
      })}
    </div>
  );
}

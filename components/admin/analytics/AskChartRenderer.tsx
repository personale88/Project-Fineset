"use client";

import { AnalyticsBreakdownChart } from "@/components/admin/analytics/AnalyticsBreakdownChart";
import { AnalyticsComparisonTrendChart } from "@/components/admin/analytics/AnalyticsComparisonTrendChart";
import { AnalyticsPieChart } from "@/components/admin/analytics/AnalyticsPieChart";
import { AnalyticsRadarChart } from "@/components/admin/analytics/AnalyticsRadarChart";
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
  return (
    <div className="grid gap-4 sm:gap-6 xl:grid-cols-2">
      {charts.map((chart, index) => {
        const key = `${chart.type}-${index}`;
        switch (chart.type) {
          case "line":
            return (
              <AnalyticsTrendChart
                key={key}
                title={chart.title}
                description={chart.description}
                data={chart.trend ?? []}
                revenueLabel={revenueLabel}
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
                emptyMessage={emptyBreakdown}
              />
            );
          case "comparison":
            return chart.comparison && chart.periodALabel && chart.periodBLabel ? (
              <AnalyticsComparisonTrendChart
                key={key}
                title={chart.title}
                periodALabel={chart.periodALabel}
                periodBLabel={chart.periodBLabel}
                revenueLabel={revenueLabel}
                data={chart.comparison}
              />
            ) : null;
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

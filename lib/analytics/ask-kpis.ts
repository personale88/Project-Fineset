import {
  buildAskWidgetContext,
  pickAskKpiMetrics,
  type AskKpiCardSpec,
  type AskKpiMetricKey,
} from "@/lib/analytics/ask-widget-catalog";
import type { ParsedAnalyticsAskIntent } from "@/lib/validations/admin-business-analytics-ask.schema";
import type { AnalyticsSummary } from "@/types/admin-business-analytics";

export type { AskKpiCardSpec, AskKpiMetricKey };

export interface AskKpiDeltas {
  totalVisits: number;
  totalRevenue: number;
  conversionRate: number;
  uniqueCustomers: number;
  avgTransaction: number;
  fieldSalesCount: number;
}

const DELTA_BY_METRIC: Record<AskKpiMetricKey, keyof AskKpiDeltas> = {
  visits: "totalVisits",
  revenue: "totalRevenue",
  conversion: "conversionRate",
  avgTransaction: "avgTransaction",
  fieldSales: "fieldSalesCount",
  uniqueCustomers: "uniqueCustomers",
};

export function formatAskKpiValue(
  metric: AskKpiMetricKey,
  summary: AnalyticsSummary,
  formatCurrency: (n: number) => string,
): string | number {
  switch (metric) {
    case "visits":
      return summary.totalVisits;
    case "revenue":
      return formatCurrency(summary.totalRevenue);
    case "conversion":
      return summary.conversionRate;
    case "avgTransaction":
      return formatCurrency(summary.avgTransaction);
    case "fieldSales":
      return summary.fieldSalesCount;
    case "uniqueCustomers":
      return summary.uniqueCustomers;
  }
}

export function buildAskKpis(
  intent: ParsedAnalyticsAskIntent,
  summary: AnalyticsSummary,
  options?: {
    prompt?: string;
    deltas?: AskKpiDeltas | null;
  },
): AskKpiCardSpec[] {
  const ctx = buildAskWidgetContext(intent, options?.prompt ?? "");
  const metrics = pickAskKpiMetrics(ctx);
  const deltas = options?.deltas;

  return metrics.map((metric) => {
    const deltaKey = DELTA_BY_METRIC[metric];
    const delta = deltas ? deltas[deltaKey] : undefined;
    return {
      metric,
      ...(delta !== undefined ? { delta } : {}),
    };
  });
}

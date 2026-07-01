import { COHORT_PIVOT_LABELS, type CohortPivotDimension } from "@/lib/analytics/cohort-pivot";
import {
  pickAskChartHintsFromPrompt,
  buildAskWidgetContext,
} from "@/lib/analytics/ask-widget-catalog";
import {
  pickChartTypesForScenario,
  resolveAskChartMetric,
  resolveAskChartScenario,
} from "@/lib/analytics/ask-chart-scenarios";
import type { ParsedAnalyticsAskIntent } from "@/lib/validations/admin-business-analytics-ask.schema";
import type {
  AnalyticsAskChart,
  AnalyticsAskChartType,
  AnalyticsAskRadarPoint,
} from "@/types/admin-business-analytics-ask";
import type { AdminBusinessAnalytics } from "@/types/admin-business-analytics";
import type { BreakdownRow } from "@/types/admin-business-analytics";

const MAX_PIE_SLICES = 7;

function getBreakdownRows(
  analytics: AdminBusinessAnalytics,
  dimension: CohortPivotDimension,
): BreakdownRow[] {
  switch (dimension) {
    case "customerType":
      return analytics.breakdowns.customerType;
    case "valueTier":
      return analytics.breakdowns.valueTier;
    case "intentTier":
      return analytics.breakdowns.intentTier;
    case "purchaseStatus":
      return analytics.breakdowns.purchaseStatus;
    case "sourceChannel":
      return analytics.breakdowns.sourceChannel;
    case "gender":
      return analytics.breakdowns.gender;
    case "ageGroup":
      return analytics.breakdowns.ageGroup;
    case "area":
      return analytics.breakdowns.area;
    case "visitType":
      return analytics.breakdowns.visitType;
    case "budgetRange":
      return analytics.breakdowns.budgetRange;
    case "productCategory":
      return analytics.breakdowns.productsExplored;
    case "schemeProduct":
      return analytics.breakdowns.schemeProduct;
    case "enrollmentOutcome":
      return analytics.breakdowns.enrollmentOutcome;
  }
}

function capPieBreakdown(rows: BreakdownRow[], metric: ReturnType<typeof resolveAskChartMetric>): BreakdownRow[] {
  const valueOf = (row: BreakdownRow) =>
    metric === "revenue" ? (row.revenue ?? 0) : row.count;
  const sorted = [...rows].sort((a, b) => valueOf(b) - valueOf(a));
  if (sorted.length <= MAX_PIE_SLICES) return sorted;
  const top = sorted.slice(0, MAX_PIE_SLICES - 1);
  const otherCount = sorted.slice(MAX_PIE_SLICES - 1).reduce((sum, row) => sum + row.count, 0);
  const otherRevenue = sorted
    .slice(MAX_PIE_SLICES - 1)
    .reduce((sum, row) => sum + (row.revenue ?? 0), 0);
  return [...top, { label: "Other", count: otherCount, revenue: otherRevenue }];
}

function resolveBreakdownDimension(
  intent: ParsedAnalyticsAskIntent,
  prompt: string,
  scenario: ReturnType<typeof resolveAskChartScenario>,
): CohortPivotDimension {
  if (intent.breakdownDimension) return intent.breakdownDimension;
  const text = prompt.trim().toLowerCase();
  if (scenario === "revenueDistribution" || scenario === "customerTypeBreakdown") {
    if (/\bsource\b|\bchannel\b/i.test(text)) return "sourceChannel";
    if (/\bcustomer type\b/i.test(text)) return "customerType";
    if (/\brevenue\b|\bsales\b/i.test(text)) return "sourceChannel";
    return "customerType";
  }
  return "customerType";
}

function buildRadarPoints(analytics: AdminBusinessAnalytics): AnalyticsAskRadarPoint[] {
  const { summary } = analytics;
  const maxVisits = Math.max(summary.totalVisits, 1);
  const maxRevenue = Math.max(summary.totalRevenue, 1);
  const maxCustomers = Math.max(summary.uniqueCustomers, 1);
  const maxFieldSales = Math.max(summary.fieldSalesCount, 1);
  const maxAvg = Math.max(summary.avgTransaction, 1);

  return [
    {
      label: "Visits",
      value: Math.round((summary.totalVisits / maxVisits) * 100),
      fullMark: 100,
    },
    {
      label: "Revenue",
      value: Math.round((summary.totalRevenue / maxRevenue) * 100),
      fullMark: 100,
    },
    {
      label: "Conversion",
      value: Math.min(100, Math.round(summary.conversionRate * 4)),
      fullMark: 100,
    },
    {
      label: "Customers",
      value: Math.round((summary.uniqueCustomers / maxCustomers) * 100),
      fullMark: 100,
    },
    {
      label: "Avg ticket",
      value: Math.round((summary.avgTransaction / maxAvg) * 100),
      fullMark: 100,
    },
    {
      label: "Field sales",
      value: Math.round((summary.fieldSalesCount / maxFieldSales) * 100),
      fullMark: 100,
    },
  ];
}

function mergeIntentChartHints(
  intent: ParsedAnalyticsAskIntent,
  prompt: string,
): ParsedAnalyticsAskIntent {
  const ctx = buildAskWidgetContext(intent, prompt);
  const contextHints = pickAskChartHintsFromPrompt(prompt, ctx);
  const merged = new Set<AnalyticsAskChartType>([
    ...(intent.chartTypes ?? []),
    ...contextHints,
  ]);
  return { ...intent, chartTypes: Array.from(merged) };
}

/** @deprecated Use pickChartTypesForScenario via buildAskCharts */
export function pickChartTypesFromData(
  analytics: AdminBusinessAnalytics,
  intent: ParsedAnalyticsAskIntent,
  prompt = "",
): AnalyticsAskChartType[] {
  const scenario = resolveAskChartScenario(intent, prompt, analytics);
  return pickChartTypesForScenario(scenario, intent, analytics, prompt);
}

function buildChartForType(
  type: AnalyticsAskChartType,
  enrichedIntent: ParsedAnalyticsAskIntent,
  analytics: AdminBusinessAnalytics,
  options: {
    dimension: CohortPivotDimension;
    breakdown: BreakdownRow[];
    dimLabel: string;
    metric: ReturnType<typeof resolveAskChartMetric>;
    prompt: string;
  },
): AnalyticsAskChart | null {
  const { dimension, breakdown, dimLabel, metric, prompt } = options;

  switch (type) {
    case "area":
    case "line":
      if (analytics.trends.length === 0) return null;
      return {
        type: "area",
        title: metric === "revenue" ? `Revenue trend · ${analytics.period.label}` : `Visit trend · ${analytics.period.label}`,
        description: `Daily ${metric === "revenue" ? "revenue" : "visits"} over ${analytics.period.label}`,
        trend: analytics.trends,
      };
    case "groupedBar":
      if (!analytics.comparison?.comparisonTrends.length) return null;
      return {
        type: "groupedBar",
        title: "Year-on-year comparison",
        description: `${metric === "revenue" ? "Revenue" : "Visits"} by day — ${analytics.period.label} vs ${analytics.comparison.period.label}`,
        comparison: analytics.comparison.comparisonTrends,
        periodALabel: analytics.period.label,
        periodBLabel: analytics.comparison.period.label,
        metric,
      };
    case "comparison":
      if (!analytics.comparison?.comparisonTrends.length) return null;
      return {
        type: "comparison",
        title: "Month-on-month comparison",
        description: `${analytics.period.label} vs ${analytics.comparison.period.label}`,
        comparison: analytics.comparison.comparisonTrends,
        periodALabel: analytics.period.label,
        periodBLabel: analytics.comparison.period.label,
        metric,
      };
    case "pie":
      if (breakdown.length === 0) return null;
      return {
        type: "pie",
        title: `${dimLabel} distribution`,
        description:
          metric === "revenue"
            ? `Share of revenue by ${dimLabel.toLowerCase()} (max ${MAX_PIE_SLICES} categories)`
            : `Share of visits by ${dimLabel.toLowerCase()} (max ${MAX_PIE_SLICES} categories)`,
        breakdown: capPieBreakdown(breakdown, metric),
        metric,
      };
    case "rankedBar":
      if (breakdown.length === 0) return null;
      return {
        type: "rankedBar",
        title: `Top ${dimLabel.toLowerCase()}`,
        description: `Ranked by visit count · ${analytics.period.label}`,
        breakdown,
      };
    case "stackedBar":
      if (breakdown.length === 0) return null;
      return {
        type: "stackedBar",
        title: `${dimLabel} split`,
        description: `Composition for ${analytics.period.label}`,
        breakdown: capPieBreakdown(breakdown, metric),
        periodLabel: analytics.period.label,
      };
    case "bar":
      if (breakdown.length === 0) return null;
      return {
        type: "rankedBar",
        title: `${dimLabel} breakdown`,
        description: `Visit counts by ${dimLabel.toLowerCase()}`,
        breakdown,
      };
    case "radar":
      return {
        type: "radar",
        title: "Customer segment profile",
        description: "Normalized view of key metrics (0–100 scale)",
        radar: buildRadarPoints(analytics),
      };
    default:
      return null;
  }
}

export function buildAskCharts(
  intent: ParsedAnalyticsAskIntent,
  analytics: AdminBusinessAnalytics,
  options?: { prompt?: string },
): AnalyticsAskChart[] {
  const prompt = options?.prompt ?? "";
  const enrichedIntent = prompt ? mergeIntentChartHints(intent, prompt) : intent;
  const scenario = resolveAskChartScenario(enrichedIntent, prompt, analytics);
  const dimension = resolveBreakdownDimension(enrichedIntent, prompt, scenario);
  const breakdown = getBreakdownRows(analytics, dimension).slice(0, 12);
  const dimLabel = COHORT_PIVOT_LABELS[dimension];
  const metric = resolveAskChartMetric(prompt);
  const chartTypes = pickChartTypesForScenario(scenario, enrichedIntent, analytics, prompt);

  const charts: AnalyticsAskChart[] = [];
  for (const type of chartTypes) {
    const chart = buildChartForType(type, enrichedIntent, analytics, {
      dimension,
      breakdown,
      dimLabel,
      metric,
      prompt,
    });
    if (chart && !charts.some((c) => c.type === chart.type)) {
      charts.push(chart);
    }
  }

  if (
    charts.length === 0 &&
    chartTypes.includes("pie") &&
    analytics.trends.length >= 2
  ) {
    const areaChart = buildChartForType("area", enrichedIntent, analytics, {
      dimension,
      breakdown,
      dimLabel,
      metric,
      prompt,
    });
    if (areaChart) charts.push(areaChart);
  }

  return charts;
}

import { COHORT_PIVOT_LABELS, type CohortPivotDimension } from "@/lib/analytics/cohort-pivot";
import {
  pickAskChartHintsFromPrompt,
  buildAskWidgetContext,
} from "@/lib/analytics/ask-widget-catalog";
import type { ParsedAnalyticsAskIntent } from "@/lib/validations/admin-business-analytics-ask.schema";
import type {
  AnalyticsAskChart,
  AnalyticsAskChartType,
  AnalyticsAskRadarPoint,
} from "@/types/admin-business-analytics-ask";
import type { AdminBusinessAnalytics } from "@/types/admin-business-analytics";

function getBreakdownRows(
  analytics: AdminBusinessAnalytics,
  dimension: CohortPivotDimension,
): AdminBusinessAnalytics["breakdowns"]["customerType"] {
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

/**
 * Chooses chart types from data shape, with optional hints when the user names a chart.
 */
export function pickChartTypesFromData(
  analytics: AdminBusinessAnalytics,
  intent: ParsedAnalyticsAskIntent,
): AnalyticsAskChartType[] {
  const hints = intent.chartTypes;
  const dimension = intent.breakdownDimension ?? "customerType";
  const breakdown = getBreakdownRows(analytics, dimension);
  const categoryCount = breakdown.length;
  const hasTimeSeries = analytics.trends.length >= 2;
  const isPeriodCompare = Boolean(analytics.comparison);
  const dataPicks: AnalyticsAskChartType[] = [];

  if (isPeriodCompare) {
    dataPicks.push("comparison");
    if (hasTimeSeries) dataPicks.push("line");
    if (categoryCount >= 2) dataPicks.push(categoryCount <= 6 ? "pie" : "bar");
    else dataPicks.push("bar");
  } else if (intent.breakdownDimension === "purchaseStatus" || hints.includes("pie")) {
    if (categoryCount >= 2) dataPicks.push(categoryCount <= 6 ? "pie" : "bar");
    if (hasTimeSeries) dataPicks.push("line");
  } else if (intent.breakdownDimension === "sourceChannel") {
    if (categoryCount >= 2) {
      dataPicks.push(categoryCount <= 6 ? "pie" : "bar");
    }
    if (hasTimeSeries && !dataPicks.includes("line")) dataPicks.push("line");
  } else {
    if (hasTimeSeries) dataPicks.push("line");
    if (categoryCount >= 2) {
      if (categoryCount <= 6) dataPicks.push("pie");
      if (categoryCount > 4) dataPicks.push("bar");
      else if (!hasTimeSeries) dataPicks.push("bar");
    }
    if (dataPicks.length === 0) {
      dataPicks.push(hasTimeSeries ? "line" : "bar");
    }
    if (
      dataPicks.length === 1 &&
      analytics.summary.totalVisits > 0 &&
      !hints.includes("radar")
    ) {
      dataPicks.push("radar");
    }
  }

  if (hints.includes("radar") && !dataPicks.includes("radar")) {
    dataPicks.push("radar");
  }

  return mergeChartTypes(dataPicks, hints).slice(0, 4);
}

function mergeChartTypes(
  dataPicks: AnalyticsAskChartType[],
  hints: AnalyticsAskChartType[],
): AnalyticsAskChartType[] {
  const ordered: AnalyticsAskChartType[] = [];
  const add = (type: AnalyticsAskChartType) => {
    if (!ordered.includes(type)) ordered.push(type);
  };
  for (const type of hints) add(type);
  for (const type of dataPicks) add(type);
  return ordered;
}

function lineChartTitle(intent: ParsedAnalyticsAskIntent, periodLabel: string): string {
  const text = intent.chartTypes?.includes("line") ? "Trend" : "Revenue trend";
  if (intent.breakdownDimension === "sourceChannel") {
    return `Visit source trend · ${periodLabel}`;
  }
  return `${text} · ${periodLabel}`;
}

export function buildAskCharts(
  intent: ParsedAnalyticsAskIntent,
  analytics: AdminBusinessAnalytics,
  options?: { prompt?: string },
): AnalyticsAskChart[] {
  const enrichedIntent = options?.prompt
    ? mergeIntentChartHints(intent, options.prompt)
    : intent;
  const dimension = enrichedIntent.breakdownDimension ?? "customerType";
  const breakdown = getBreakdownRows(analytics, dimension).slice(0, 12);
  const dimLabel = COHORT_PIVOT_LABELS[dimension];
  const chartTypes = pickChartTypesFromData(analytics, enrichedIntent);
  const charts: AnalyticsAskChart[] = [];

  for (const type of chartTypes) {
    switch (type) {
      case "line":
        if (!charts.some((c) => c.type === "line") && analytics.trends.length > 0) {
          charts.push({
            type: "line",
            title: lineChartTitle(enrichedIntent, analytics.period.label),
            description: `Daily visits and revenue for ${analytics.period.label}`,
            trend: analytics.trends,
          });
        }
        break;
      case "comparison":
        if (analytics.comparison && !charts.some((c) => c.type === "comparison")) {
          charts.push({
            type: "comparison",
            title: "Period comparison",
            description: `${analytics.period.label} vs ${analytics.comparison.period.label}`,
            comparison: analytics.comparison.comparisonTrends,
            periodALabel: analytics.period.label,
            periodBLabel: analytics.comparison.period.label,
          });
        }
        break;
      case "bar":
        if (!charts.some((c) => c.type === "bar") && breakdown.length > 0) {
          charts.push({
            type: "bar",
            title: `${dimLabel} breakdown`,
            description: `Visit counts by ${dimLabel.toLowerCase()}`,
            breakdown,
          });
        }
        break;
      case "pie":
        if (!charts.some((c) => c.type === "pie") && breakdown.length > 0) {
          charts.push({
            type: "pie",
            title: `${dimLabel} mix`,
            description: `Share of visits by ${dimLabel.toLowerCase()}`,
            breakdown,
          });
        }
        break;
      case "radar":
        if (!charts.some((c) => c.type === "radar")) {
          charts.push({
            type: "radar",
            title: "Performance snapshot",
            description: "Normalized view of key metrics (0–100 scale)",
            radar: buildRadarPoints(analytics),
          });
        }
        break;
    }
  }

  return charts;
}

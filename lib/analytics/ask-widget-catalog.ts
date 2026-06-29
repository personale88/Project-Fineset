import type { AnalyticsAskChartType } from "@/types/admin-business-analytics-ask";
import type { CohortPivotDimension } from "@/lib/analytics/cohort-pivot";

/** KPI metrics available in AI Ask (maps to content `admin.analytics.kpis`). */
export const ASK_KPI_METRICS = [
  "visits",
  "revenue",
  "conversion",
  "avgTransaction",
  "fieldSales",
  "uniqueCustomers",
] as const;

export type AskKpiMetricKey = (typeof ASK_KPI_METRICS)[number];

export const ASK_CHART_TYPES = [
  "line",
  "area",
  "bar",
  "rankedBar",
  "stackedBar",
  "groupedBar",
  "pie",
  "comparison",
  "radar",
] as const satisfies ReadonlyArray<AnalyticsAskChartType>;

export type AskChartCatalogType = (typeof ASK_CHART_TYPES)[number];

export interface AskKpiCardSpec {
  metric: AskKpiMetricKey;
  delta?: number;
}

/** Default KPI row when no intent-specific rule matches. */
export const DEFAULT_ASK_KPI_METRICS: AskKpiMetricKey[] = [
  "visits",
  "revenue",
  "conversion",
  "avgTransaction",
  "fieldSales",
  "uniqueCustomers",
];

export interface AskWidgetContext {
  segment?: string;
  dateMode?: string;
  breakdownDimension?: CohortPivotDimension;
  chartHints?: AnalyticsAskChartType[];
  hasComparison: boolean;
  isTrendQuestion: boolean;
  isConversionFocus: boolean;
  isSchemeFocus: boolean;
}

export function buildAskWidgetContext(
  intent: {
    segment?: string;
    dateMode?: string;
    breakdownDimension?: CohortPivotDimension;
    chartTypes?: AnalyticsAskChartType[];
  },
  prompt: string,
): AskWidgetContext {
  const text = prompt.toLowerCase();
  return {
    segment: intent.segment,
    dateMode: intent.dateMode,
    breakdownDimension: intent.breakdownDimension,
    chartHints: intent.chartTypes,
    hasComparison: intent.dateMode === "compare",
    isTrendQuestion: /\btrend\b|\bover time\b|\bdaily\b|\brevenue trend\b/.test(text),
    isConversionFocus:
      intent.breakdownDimension === "purchaseStatus" ||
      /\bconversion\b|\bpurchase status\b/.test(text),
    isSchemeFocus:
      intent.breakdownDimension === "enrollmentOutcome" ||
      intent.breakdownDimension === "schemeProduct" ||
      /\bscheme\b|\bghs\b|\bgpp\b|\benrollment\b/.test(text),
  };
}

/** KPI metrics to surface for a given ask context. */
export function pickAskKpiMetrics(ctx: AskWidgetContext): AskKpiMetricKey[] {
  if (ctx.hasComparison) {
    return ["visits", "revenue", "conversion", "uniqueCustomers", "avgTransaction"];
  }

  if (ctx.segment === "RETAINED" || ctx.segment === "NEW") {
    return ["uniqueCustomers", "conversion", "visits", "revenue", "avgTransaction"];
  }

  if (ctx.isSchemeFocus) {
    return ["fieldSales", "conversion", "visits", "revenue", "uniqueCustomers"];
  }

  if (ctx.isConversionFocus) {
    return ["conversion", "visits", "revenue", "uniqueCustomers", "avgTransaction"];
  }

  if (ctx.breakdownDimension === "sourceChannel") {
    return ["visits", "revenue", "conversion", "uniqueCustomers"];
  }

  if (ctx.isTrendQuestion) {
    return ["revenue", "visits", "conversion", "avgTransaction"];
  }

  return DEFAULT_ASK_KPI_METRICS;
}

/** Chart type priority hints from ask context (merged with data-driven picks). */
export function pickAskChartHintsFromContext(ctx: AskWidgetContext): AnalyticsAskChartType[] {
  const hints: AnalyticsAskChartType[] = [...(ctx.chartHints ?? [])];

  if (ctx.hasComparison && !hints.includes("comparison") && !hints.includes("groupedBar")) {
    hints.unshift("comparison");
  }

  if (ctx.isTrendQuestion && !hints.includes("line") && !hints.includes("area")) {
    hints.push("area");
  }

  if (ctx.isConversionFocus && !hints.includes("pie")) {
    hints.push("pie");
  }

  if (/\bsnapshot\b|\boverview\b|\bperformance snapshot\b/.test(ctx.segment ?? "")) {
    // segment field misuse guard — check via empty; snapshot in prompt handled below
  }

  return hints;
}

export function pickAskChartHintsFromPrompt(
  prompt: string,
  ctx: AskWidgetContext,
): AnalyticsAskChartType[] {
  const hints = pickAskChartHintsFromContext(ctx);
  const text = prompt.toLowerCase();

  if (/\bsnapshot\b|\boverview\b|\bmulti.?metric\b/.test(text) && !hints.includes("radar")) {
    hints.push("radar");
  }

  return hints;
}

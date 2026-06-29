import type { ParsedAnalyticsAskIntent } from "@/lib/validations/admin-business-analytics-ask.schema";
import type { AnalyticsAskChartType } from "@/types/admin-business-analytics-ask";
import type { AdminBusinessAnalytics } from "@/types/admin-business-analytics";

export type AskChartScenario =
  | "yoyCompare"
  | "momCompare"
  | "salesOverTime"
  | "revenueDistribution"
  | "topProductsRanked"
  | "customerSegments"
  | "periodTypeSplit"
  | "customerTypeBreakdown"
  | "growthForecast"
  | "summaryKpis"
  | "auto";

export type AskChartMetric = "visits" | "revenue";

const YOY_PATTERN = /\byoy\b|\by\.?o\.?y\.?\b|\byear[- ]on[- ]year\b|\byear over year\b/i;
const MOM_PATTERN =
  /\bmom\b|\bm\.?o\.?m\.?\b|\bmonth[- ]on[- ]month\b|\bmonth over month\b/i;
const TREND_PATTERN =
  /\btrend\b|\bover time\b|\btotal sales\b|\brevenue trend\b|\bdaily\b|\bweekly\b/i;
const DISTRIBUTION_PATTERN =
  /\bdistribution\b|\bshare\b|\bmix\b|\bbreakdown\b|\bsplit\b/i;
const TOP_RANKED_PATTERN = /\btop\b|\bbest\b|\branked\b|\bhighest\b|\bmost popular\b/i;
const SEGMENT_PROFILE_PATTERN =
  /\bsegment\b|\bprofile\b|\bmulti.?dim/i;
const TYPE_SPLIT_PATTERN =
  /\bby customer type over time\b|\bcustomer type over time\b|\btype split\b|\bover time by type\b/i;
const FORECAST_PATTERN = /\bforecast\b|\bprojected\b|\bgrowth projection\b|\bpredict\b/i;
const SUMMARY_PATTERN =
  /\bhow are we\b|\boverview\b|\bsummary\b|\bhow did we do\b|\boverall performance\b/i;
const SNAPSHOT_PATTERN = /\bsnapshot\b|\bperformance snapshot\b|\bradar\b/i;

function promptText(prompt: string): string {
  return prompt.trim().toLowerCase();
}

function isCompareIntent(intent: ParsedAnalyticsAskIntent): boolean {
  return intent.dateMode === "compare" || Boolean(intent.compareAMonth);
}

function isYearOnYearCompare(intent: ParsedAnalyticsAskIntent, text: string): boolean {
  if (YOY_PATTERN.test(text)) return true;
  if (
    intent.compareAYear &&
    intent.compareBYear &&
    intent.compareAYear !== intent.compareBYear
  ) {
    return true;
  }
  return false;
}

function isMonthOnMonthCompare(intent: ParsedAnalyticsAskIntent, text: string): boolean {
  if (MOM_PATTERN.test(text)) return true;
  if (!isCompareIntent(intent)) return false;
  if (isYearOnYearCompare(intent, text)) return false;
  if (
    intent.compareAYear &&
    intent.compareBYear &&
    intent.compareAYear === intent.compareBYear &&
    intent.compareAMonth !== intent.compareBMonth
  ) {
    return true;
  }
  return isCompareIntent(intent) && !isYearOnYearCompare(intent, text);
}

export function resolveAskChartMetric(prompt: string): AskChartMetric {
  const text = promptText(prompt);
  if (/\brevenue\b|\bsales\b|\b₹\b|\brupee/i.test(text) && !/\bvisits?\b/i.test(text)) {
    return "revenue";
  }
  return "visits";
}

export function wantsTrendAndBreakdown(prompt: string): boolean {
  const text = promptText(prompt);
  return (
    TREND_PATTERN.test(text) &&
    (DISTRIBUTION_PATTERN.test(text) || /\bby customer type\b|\bby source\b/i.test(text))
  );
}

export function resolveAskChartScenario(
  intent: ParsedAnalyticsAskIntent,
  prompt: string,
  analytics: AdminBusinessAnalytics,
): AskChartScenario {
  const text = promptText(prompt);

  if (intent.chartTypes?.length) {
    // Explicit chart hints from parser/Gemini — still classify compare sub-type.
    if (isCompareIntent(intent)) {
      return isYearOnYearCompare(intent, text) ? "yoyCompare" : "momCompare";
    }
  }

  if (isCompareIntent(intent)) {
    return isYearOnYearCompare(intent, text) ? "yoyCompare" : "momCompare";
  }

  if (FORECAST_PATTERN.test(text)) return "growthForecast";
  if (SUMMARY_PATTERN.test(text) && !DISTRIBUTION_PATTERN.test(text)) {
    return "summaryKpis";
  }
  if (SNAPSHOT_PATTERN.test(text)) return "customerSegments";

  if (TYPE_SPLIT_PATTERN.test(text)) return "periodTypeSplit";

  if (
    TOP_RANKED_PATTERN.test(text) &&
    (/\bproducts?\b|\bexplored\b|\bpurchased\b|\bjewelry\b|\bring\b/i.test(text) ||
      intent.breakdownDimension === "productCategory")
  ) {
    return "topProductsRanked";
  }

  if (
    (intent.breakdownDimension === "productCategory" ||
      /\bproduct\b|\bjewelry\b|\bring\b/i.test(text)) &&
    TOP_RANKED_PATTERN.test(text)
  ) {
    return "topProductsRanked";
  }

  if (
    intent.breakdownDimension === "valueTier" ||
    intent.breakdownDimension === "intentTier" ||
    SEGMENT_PROFILE_PATTERN.test(text)
  ) {
    return "customerSegments";
  }

  if (TREND_PATTERN.test(text) && !DISTRIBUTION_PATTERN.test(text)) {
    return "salesOverTime";
  }

  if (
    intent.breakdownDimension === "customerType" &&
    !TREND_PATTERN.test(text) &&
    !TYPE_SPLIT_PATTERN.test(text)
  ) {
    return "customerTypeBreakdown";
  }

  if (
    intent.breakdownDimension === "purchaseStatus" ||
    intent.breakdownDimension === "sourceChannel" ||
    DISTRIBUTION_PATTERN.test(text)
  ) {
    return "revenueDistribution";
  }

  if (analytics.comparison) {
    return isYearOnYearCompare(intent, text) ? "yoyCompare" : "momCompare";
  }

  if (analytics.trends.length >= 2 && !intent.breakdownDimension) {
    return "salesOverTime";
  }

  if (intent.breakdownDimension) {
    return TOP_RANKED_PATTERN.test(text) ? "topProductsRanked" : "revenueDistribution";
  }

  return "auto";
}

export function chartTypeForScenario(scenario: AskChartScenario): AnalyticsAskChartType | null {
  switch (scenario) {
    case "yoyCompare":
      return "groupedBar";
    case "momCompare":
      return "comparison";
    case "salesOverTime":
      return "area";
    case "revenueDistribution":
    case "customerTypeBreakdown":
      return "pie";
    case "topProductsRanked":
      return "rankedBar";
    case "customerSegments":
      return "radar";
    case "periodTypeSplit":
      return "stackedBar";
    case "growthForecast":
      return "area";
    case "summaryKpis":
      return null;
    case "auto":
      return null;
  }
}

export function pickChartTypesForScenario(
  scenario: AskChartScenario,
  intent: ParsedAnalyticsAskIntent,
  analytics: AdminBusinessAnalytics,
  prompt: string,
): AnalyticsAskChartType[] {
  if (scenario === "summaryKpis") return [];

  const hints = intent.chartTypes ?? [];
  const primary = chartTypeForScenario(scenario);

  if (
    wantsTrendAndBreakdown(prompt) &&
    scenario !== "periodTypeSplit" &&
    primary !== "stackedBar"
  ) {
    const types: AnalyticsAskChartType[] = ["area"];
    if (primary === "pie" || scenario === "customerTypeBreakdown") types.push("pie");
    else if (primary && primary !== "area") types.push(primary);
    return types.slice(0, 2);
  }

  if (primary) {
    return [primary];
  }

  // Auto / fallback: respect explicit hints, else one sensible chart from data.
  if (hints.length > 0) {
    return hints.slice(0, 1);
  }

  if (analytics.comparison) {
    return [isYearOnYearCompare(intent, promptText(prompt)) ? "groupedBar" : "comparison"];
  }

  const dimension = intent.breakdownDimension ?? "customerType";
  let categoryCount = 0;
  if (dimension === "productCategory") {
    categoryCount = analytics.breakdowns.productsExplored.length;
  } else if (dimension in analytics.breakdowns) {
    const rows = analytics.breakdowns[dimension as keyof typeof analytics.breakdowns];
    categoryCount = Array.isArray(rows) ? rows.length : 0;
  }

  if (analytics.trends.length >= 2) return ["area"];
  if (categoryCount >= 2 && categoryCount <= 7) return ["pie"];
  if (categoryCount > 0) return ["rankedBar"];
  return ["area"];
}

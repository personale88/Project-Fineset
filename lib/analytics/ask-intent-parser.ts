import type { CohortPivotDimension } from "@/lib/analytics/cohort-pivot";
import type { ParsedAnalyticsAskIntent } from "@/lib/validations/admin-business-analytics-ask.schema";
import { formatMonthYearLabel } from "@/lib/utils/analytics-date-range";
import type { AnalyticsAskChartType } from "@/types/admin-business-analytics-ask";

const MONTH_MAP: Record<string, number> = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sep: 9,
  sept: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
};

const CHART_KEYWORDS: Array<{ type: AnalyticsAskChartType; patterns: RegExp[] }> = [
  { type: "pie", patterns: [/\bpie\b/, /\bdonut\b/, /\bshare\b/, /\bdistribution\b/] },
  { type: "line", patterns: [/\bline\b/, /\btrend\b/, /\bover time\b/, /\bdaily\b/] },
  { type: "bar", patterns: [/\bbar\b/, /\bbreakdown\b/, /\bby category\b/] },
  {
    type: "comparison",
    patterns: [/\bcompar(e|ison|ing)\b/, /\bvs\.?\b/, /\bversus\b/, /\byoy\b/, /\bmonth over month\b/],
  },
  { type: "radar", patterns: [/\bradar\b/, /\bspider\b/, /\bmulti.?metric\b/] },
];

const DIMENSION_KEYWORDS: Array<{ dimension: CohortPivotDimension; patterns: RegExp[] }> = [
  { dimension: "customerType", patterns: [/\bcustomer type\b/, /\bnew\b.*\brepeat\b/, /\bvip\b/] },
  { dimension: "valueTier", patterns: [/\bvalue tier\b/, /\bhigh value\b/, /\bprice band\b/] },
  { dimension: "purchaseStatus", patterns: [/\bpurchase\b/, /\bconversion\b/, /\bpurchased\b/] },
  { dimension: "sourceChannel", patterns: [/\bsource\b/, /\bchannel\b/, /\bwalk.?in\b/, /\breferral\b/] },
  { dimension: "productCategory", patterns: [/\bproduct\b/, /\bjewelry\b/, /\bring\b/, /\bnecklace\b/] },
  { dimension: "area", patterns: [/\blocation\b/, /\barea\b/, /\bcity\b/, /\bhyderabad\b/] },
  { dimension: "intentTier", patterns: [/\bintent\b/, /\bhot\b.*\bwarm\b/] },
  { dimension: "enrollmentOutcome", patterns: [/\benrollment\b/, /\bghs\b/, /\bgpp\b/, /\bscheme\b/] },
];

function parseMonthYear(text: string): { month: number; year: number } | null {
  const monthYear = text.match(
    /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\s+(\d{4})\b/i,
  );
  if (monthYear) {
    const month = MONTH_MAP[monthYear[1].toLowerCase()];
    return { month, year: Number(monthYear[2]) };
  }

  const yearMonth = text.match(/\b(\d{4})[-/](\d{1,2})\b/);
  if (yearMonth) {
    return { month: Number(yearMonth[2]), year: Number(yearMonth[1]) };
  }

  return null;
}

/** Explicit chart mentions in the question (optional hints for auto-picker). */
function extractChartHints(text: string): AnalyticsAskChartType[] {
  const found = new Set<AnalyticsAskChartType>();
  for (const { type, patterns } of CHART_KEYWORDS) {
    if (patterns.some((p) => p.test(text))) found.add(type);
  }
  return Array.from(found);
}

function extractDimension(text: string): CohortPivotDimension | undefined {
  for (const { dimension, patterns } of DIMENSION_KEYWORDS) {
    if (patterns.some((p) => p.test(text))) return dimension;
  }
  return undefined;
}

function extractFilters(text: string): Partial<ParsedAnalyticsAskIntent> {
  const activeFilters: string[] = [];
  const filters: Partial<ParsedAnalyticsAskIntent> = {};

  if (/\bhigh value\b|\bhigh.?tier\b/.test(text)) {
    activeFilters.push("valueTier");
    filters.valueTier = "HIGH";
  } else if (/\bmid value\b|\bmid.?tier\b/.test(text)) {
    activeFilters.push("valueTier");
    filters.valueTier = "MID";
  } else if (/\blow value\b|\blow.?tier\b/.test(text)) {
    activeFilters.push("valueTier");
    filters.valueTier = "LOW";
  }

  if (/\bretained\b/.test(text)) {
    activeFilters.push("segment");
    filters.segment = "RETAINED";
  } else if (/\bnot purchased\b/.test(text)) {
    activeFilters.push("segment");
    filters.segment = "NOT_PURCHASED";
  } else if (/\bpurchased customers?\b/.test(text)) {
    activeFilters.push("segment");
    filters.segment = "PURCHASED";
  } else if (/\bnew customers?\b|\bnew segment\b/.test(text)) {
    activeFilters.push("segment");
    filters.segment = "NEW";
  }

  if (/\bvip\b/.test(text)) {
    activeFilters.push("customerType");
    filters.customerType = "VIP";
  } else if (/\brepeat customers?\b/.test(text)) {
    activeFilters.push("customerType");
    filters.customerType = "REPEAT";
  }

  const products: Array<{ key: ParsedAnalyticsAskIntent["productCategory"]; pattern: RegExp }> = [
    { key: "BANGLES", pattern: /\bbangles?\b/ },
    { key: "BRACELET", pattern: /\bbracelets?\b/ },
    { key: "EAR_RINGS", pattern: /\bear[\s-]?rings?\b/ },
    { key: "FINGER_RINGS", pattern: /\bfinger[\s-]?rings?\b|\brings?\b/ },
    { key: "CHAINS", pattern: /\bchains?\b/ },
    { key: "NECKLACE", pattern: /\bnecklaces?\b/ },
    { key: "MANGALSUTRA", pattern: /\bmangalsutras?\b/ },
    { key: "NOSE_PIN", pattern: /\bnose[\s-]?pins?\b/ },
    { key: "PENDANTS", pattern: /\bpendants?\b/ },
    { key: "COLLOR", pattern: /\bcollors?\b|\bcollars?\b/ },
    { key: "JUMKA", pattern: /\bjumkas?\b|\bjhumkas?\b/ },
    { key: "PENDANT_EARRINGS", pattern: /\bpendant\s*(?:&|and)\s*earrings?\b/ },
    { key: "NECKLACE_EARRINGS", pattern: /\bnecklace\s*(?:&|and)\s*earrings?\b/ },
    {
      key: "NECKLACE_PENDANT_EARRINGS",
      pattern: /\bnecklace\s*(?:&|and)\s*pendant\s*(?:&|and)\s*earrings?\b/,
    },
    { key: "COINS", pattern: /\bcoins?\b/ },
    { key: "SILVER", pattern: /\bsilver\b/ },
  ];
  for (const { key, pattern } of products) {
    if (pattern.test(text)) {
      activeFilters.push("productCategory");
      filters.productCategory = key;
      break;
    }
  }

  filters.activeFilters = activeFilters;
  return filters;
}

export function parseAnalyticsAskIntent(prompt: string): ParsedAnalyticsAskIntent {
  const text = prompt.toLowerCase().trim();
  const chartTypes = extractChartHints(text);
  const breakdownDimension = extractDimension(text);
  const filterPart = extractFilters(text);

  const monthMatches = [...text.matchAll(
    /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\s+(\d{4})\b/gi,
  )].map((m) => ({
    month: MONTH_MAP[m[1].toLowerCase()],
    year: Number(m[2]),
  }));

  const isCompare =
    chartTypes.includes("comparison") ||
    /\bvs\.?\b|\bversus\b|\bcompare\b|\bcompared to\b/.test(text);

  if (isCompare && monthMatches.length >= 2) {
    const [a, b] = monthMatches;
    return {
      dateMode: "compare",
      compareAMonth: a.month,
      compareAYear: a.year,
      compareBMonth: b.month,
      compareBYear: b.year,
      chartTypes: chartTypes.includes("comparison")
        ? chartTypes
        : ["comparison", ...chartTypes],
      breakdownDimension: breakdownDimension ?? "customerType",
      activeFilters: filterPart.activeFilters ?? [],
      segment: filterPart.segment,
      valueTier: filterPart.valueTier,
      customerType: filterPart.customerType,
      productCategory: filterPart.productCategory,
      area: filterPart.area,
    };
  }

  if (monthMatches.length === 1) {
    const m = monthMatches[0];
    return {
      dateMode: "month",
      month: m.month,
      year: m.year,
      chartTypes,
      breakdownDimension: breakdownDimension ?? "customerType",
      activeFilters: filterPart.activeFilters ?? [],
      ...filterPart,
    };
  }

  if (/\blast 7 days?\b|\b7d\b|\bweek\b/.test(text)) {
    return {
      dateMode: "preset",
      period: "week",
      chartTypes,
      breakdownDimension: breakdownDimension ?? "customerType",
      activeFilters: filterPart.activeFilters ?? [],
      ...filterPart,
    };
  }

  if (/\blast 90 days?\b|\b90d\b|\b3 months?\b/.test(text)) {
    return {
      dateMode: "preset",
      period: "last3months",
      chartTypes,
      breakdownDimension: breakdownDimension ?? "customerType",
      activeFilters: filterPart.activeFilters ?? [],
      ...filterPart,
    };
  }

  if (/\blast 6 months?\b|\b6mo\b/.test(text)) {
    return {
      dateMode: "preset",
      period: "last6months",
      chartTypes,
      breakdownDimension: breakdownDimension ?? "customerType",
      activeFilters: filterPart.activeFilters ?? [],
      ...filterPart,
    };
  }

  if (/\byesterday\b/.test(text)) {
    return {
      dateMode: "preset",
      period: "yesterday",
      chartTypes,
      breakdownDimension: breakdownDimension ?? "customerType",
      activeFilters: filterPart.activeFilters ?? [],
      ...filterPart,
    };
  }

  if (/\btoday\b/.test(text)) {
    return {
      dateMode: "preset",
      period: "today",
      chartTypes,
      breakdownDimension: breakdownDimension ?? "customerType",
      activeFilters: filterPart.activeFilters ?? [],
      ...filterPart,
    };
  }

  const singleMonth = parseMonthYear(text);
  if (singleMonth) {
    return {
      dateMode: "month",
      month: singleMonth.month,
      year: singleMonth.year,
      chartTypes,
      breakdownDimension: breakdownDimension ?? "customerType",
      activeFilters: filterPart.activeFilters ?? [],
      ...filterPart,
    };
  }

  return {
    dateMode: "preset",
    period: "month",
    chartTypes,
    breakdownDimension: breakdownDimension ?? "customerType",
    activeFilters: filterPart.activeFilters ?? [],
    ...filterPart,
  };
}

export function describeParsedIntent(intent: ParsedAnalyticsAskIntent): string {
  const parts: string[] = [];

  if (
    intent.dateMode === "compare" &&
    intent.compareAMonth &&
    intent.compareAYear &&
    intent.compareBMonth &&
    intent.compareBYear
  ) {
    parts.push(
      `${formatMonthYearLabel(intent.compareAMonth, intent.compareAYear)} vs ${formatMonthYearLabel(intent.compareBMonth, intent.compareBYear)}`,
    );
  } else if (intent.dateMode === "month" && intent.month && intent.year) {
    parts.push(formatMonthYearLabel(intent.month, intent.year));
  } else if (intent.period) {
    const labels: Record<string, string> = {
      today: "Today",
      yesterday: "Yesterday",
      week: "Last 7 days",
      month: "Last 30 days",
      last3months: "Last 90 days",
      last6months: "Last 6 months",
    };
    parts.push(labels[intent.period] ?? intent.period);
  } else {
    parts.push("Last 30 days");
  }

  if (intent.segment && intent.segment !== "ALL") {
    parts.push(intent.segment.toLowerCase().replace("_", " "));
  }
  if (intent.valueTier && intent.valueTier !== "ALL") {
    parts.push(`${intent.valueTier.toLowerCase()} value`);
  }
  if (intent.customerType) parts.push(intent.customerType.toLowerCase());
  if (intent.productCategory) parts.push(intent.productCategory.toLowerCase());
  if (intent.breakdownDimension) {
    parts.push(`by ${intent.breakdownDimension.replace(/([A-Z])/g, " $1").trim().toLowerCase()}`);
  }

  return parts.join(" · ");
}

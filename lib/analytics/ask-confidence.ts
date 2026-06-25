import type { ParsedAnalyticsAskIntent } from "@/lib/validations/admin-business-analytics-ask.schema";

export type ParseConfidence = "high" | "medium" | "low";
export type ParseSource = "gemini" | "rules";

const TIME_SIGNAL =
  /\b(today|yesterday|week|month|last\s+\d+\s+days?|last\s+\d+\s+months?|90\s*days?|6\s*months?|january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec|\d{4}|compare|vs\.?|versus|this month|mtd)\b/i;

const ROLLING_MONTHS_IN_TEXT = /\blast\s+(\d{1,2})\s+months?\b/i;
const ROLLING_DAYS_IN_TEXT = /\blast\s+(\d{1,3})\s+days?\b/i;

const METRIC_SIGNAL =
  /\b(visit|revenue|conversion|customer|source|channel|breakdown|trend|performance|gmv|sales|scheme|ghs|gpp|vip|staff|rso|product|area|intent)\b/i;

export function scoreRuleParseConfidence(
  prompt: string,
  intent: ParsedAnalyticsAskIntent,
): ParseConfidence {
  const text = prompt.toLowerCase().trim();
  let score = 0;

  if (TIME_SIGNAL.test(text)) score += 2;
  if (METRIC_SIGNAL.test(text)) score += 2;
  if (intent.dateMode === "compare") score += 1;
  if (intent.dateMode === "month" && intent.month && intent.year) score += 2;
  if (intent.rollingMonths) score += 2;
  if (intent.rollingDays) score += 2;
  if ((intent.activeFilters?.length ?? 0) > 0) score += 1;
  if (intent.breakdownDimension) score += 1;

  const rollingMonthsInText = text.match(ROLLING_MONTHS_IN_TEXT);
  if (
    rollingMonthsInText &&
    intent.rollingMonths &&
    Number(rollingMonthsInText[1]) === intent.rollingMonths
  ) {
    score += 1;
  }

  const rollingDaysInText = text.match(ROLLING_DAYS_IN_TEXT);
  if (
    rollingDaysInText &&
    intent.rollingDays &&
    Number(rollingDaysInText[1]) === intent.rollingDays
  ) {
    score += 1;
  }

  if (intent.period === "last30days" && !/\blast\s+30\s+days?\b|\b30d\b/.test(text)) {
    score -= 1;
  }

  if (
    intent.period === "last30days" &&
    (ROLLING_MONTHS_IN_TEXT.test(text) || ROLLING_DAYS_IN_TEXT.test(text))
  ) {
    score -= 2;
  }

  if (text.length < 12) score -= 1;

  if (score >= 4) return "high";
  if (score >= 2) return "medium";
  return "low";
}

export function requiresParseConfirmation(
  confidence: ParseConfidence,
  source: ParseSource,
): boolean {
  if (source === "gemini") return confidence === "low";
  return confidence !== "high";
}

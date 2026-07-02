const OUT_OF_SCOPE_PATTERNS: RegExp[] = [
  /\bweather\b/,
  /\bstock\s*market\b/,
  /\bbitcoin\b|\bcrypto\b/,
  /\bpredict\s+(the\s+)?future\b/,
  /\bforecast\s+\d{4}\b/,
  /\bcompetitor\b.*\b(strategy|pricing)\b/,
  /\bwrite\s+(me\s+)?(a\s+)?(poem|story|email|code)\b/,
  /\bgenerate\s+(an?\s+)?image\b/,
  /\bignore\s+(previous|all)\s+instructions\b/,
];

export function isOutOfScopeAnalyticsPrompt(prompt: string): boolean {
  const text = prompt.toLowerCase();
  return OUT_OF_SCOPE_PATTERNS.some((pattern) => pattern.test(text));
}

export function outOfScopeMessage(): string {
  return (
    "This question is outside what FineSet analytics can answer. " +
    "Ask about visits, revenue, conversion, customer segments, visit sources, " +
    "or trends for a period and store scope you select above."
  );
}

export type DataAvailability = "ok" | "empty" | "sparse";

export function assessDataAvailability(totalVisits: number): DataAvailability {
  if (totalVisits === 0) return "empty";
  if (totalVisits < 5) return "sparse";
  return "ok";
}

export function emptyDataReportMessage(periodLabel: string, scopeLabel: string | null): string {
  const scope = scopeLabel ? ` for ${scopeLabel}` : "";
  return (
    `No visits were logged in ${periodLabel}${scope}. ` +
    "There is nothing to analyze for this period and scope — try widening the date range or changing filters."
  );
}

export function sparseDataReportMessage(totalVisits: number, periodLabel: string): string {
  return (
    `Only ${totalVisits} visit${totalVisits === 1 ? "" : "s"} in ${periodLabel}. ` +
    "Trends and breakdowns may not be statistically meaningful."
  );
}

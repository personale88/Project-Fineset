/**
 * Centralised data-quality honesty checks for analytics AI reports.
 *
 * The goal is to prevent the AI from producing confident-sounding analysis
 * on thin or incomplete data. Honesty is enforced at three layers:
 *
 * 1. Pre-query check (assessConfidence) — drives "no_data" short-circuit
 * 2. Gemini prompt injection (buildHonestyContext) — model is instructed to caveat
 * 3. UI badge (DataConfidenceBadge) — user sees the signal before the narrative loads
 */

import type { AdminBusinessAnalytics, AnalyticsSummary } from "@/types/admin-business-analytics";

// ---------------------------------------------------------------------------
// Confidence levels
// ---------------------------------------------------------------------------

export type DataConfidence = "high" | "medium" | "low" | "no_data";

/**
 * Assess confidence based on visit count and date span.
 *
 * Thresholds:
 *   no_data  → totalVisits === 0
 *   low      → totalVisits < 10  (= "sparse" in guardrails)
 *   medium   → 10 ≤ totalVisits < 50
 *   high     → totalVisits ≥ 50
 */
export function assessConfidence(
  summary: AnalyticsSummary,
): DataConfidence {
  if (summary.totalVisits === 0) return "no_data";
  if (summary.totalVisits < 10) return "low";
  if (summary.totalVisits < 50) return "medium";
  return "high";
}

// ---------------------------------------------------------------------------
// Field completeness signals
// ---------------------------------------------------------------------------

interface FieldCompletenessSignal {
  field: string;
  nullPct: number; // 0–100
}

/**
 * Inspects breakdown dimensions to detect fields with high null rates.
 * Returns only fields above the 30% null threshold.
 */
export function detectMissingFieldSignals(
  analytics: AdminBusinessAnalytics,
): FieldCompletenessSignal[] {
  const signals: FieldCompletenessSignal[] = [];
  const total = analytics.summary.totalVisits;
  if (total === 0) return signals;

  const check = (key: string, breakdownRows: Array<{ count: number }>) => {
    const covered = breakdownRows.reduce((acc, r) => acc + r.count, 0);
    const nullPct = Math.max(0, Math.round(((total - covered) / total) * 100));
    if (nullPct > 30) signals.push({ field: key, nullPct });
  };

  check("intentTier", analytics.breakdowns.intentTier);
  check("area", analytics.breakdowns.area);
  check("gender", analytics.breakdowns.gender);
  check("ageGroup", analytics.breakdowns.ageGroup);

  return signals;
}

// ---------------------------------------------------------------------------
// Honesty context builder — injected into every Gemini AI report prompt
// ---------------------------------------------------------------------------

/**
 * Builds the [DATA QUALITY] block injected before the compressed summary in
 * every AI report prompt. Gemini is instructed (in the system prompt) to lead
 * with a caveat if the block signals insufficient data.
 */
export function buildHonestyContext(
  analytics: AdminBusinessAnalytics,
): string {
  const { summary, period } = analytics;
  const confidence = assessConfidence(summary);
  const missing = detectMissingFieldSignals(analytics);

  const lines: string[] = [
    "[DATA QUALITY]",
    `Total visits: ${summary.totalVisits}`,
    `Period: ${period.label}`,
  ];

  if (analytics.comparison) {
    lines.push(
      `Comparison period: ${analytics.comparison.period.label} (${analytics.comparison.summary.totalVisits} visits)`,
    );
  }

  switch (confidence) {
    case "no_data":
      lines.push(
        "Warning: No visit data recorded in this period. Do NOT fabricate metrics or trends.",
      );
      break;
    case "low":
      lines.push(
        `Warning: Sample size is very small (${summary.totalVisits} visits). Do not make confident trend claims. Begin your summary with an explicit caveat about insufficient data.`,
      );
      break;
    case "medium":
      lines.push(
        `Note: Limited data (${summary.totalVisits} visits). Interpret trends cautiously.`,
      );
      break;
    case "high":
      // No warning needed — sufficient data
      break;
  }

  if (missing.length > 0) {
    const missingStr = missing
      .map((s) => `${s.field} (${s.nullPct}% null)`)
      .join(", ");
    lines.push(`Missing or sparse fields: ${missingStr}`);
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Canned honest messages (when AI is skipped entirely)
// ---------------------------------------------------------------------------

export function noDataHonestMessage(periodLabel: string, scopeLabel: string): string {
  const scope = scopeLabel ? ` for ${scopeLabel}` : "";
  return `No visit data was recorded${scope} during ${periodLabel}. Once visits are logged, this section will show revenue, conversion rates, and customer breakdowns.`;
}

export function sparseDataWarning(totalVisits: number): string {
  return `Only ${totalVisits} ${totalVisits === 1 ? "visit" : "visits"} recorded — trends and conversion rates may not be statistically meaningful. Add more visit data for reliable insights.`;
}

import { prisma } from "@/lib/db/prisma";
import type { ParseConfidence, ParseSource } from "@/lib/analytics/ask-confidence";
import type { AnalyticsAskErrorCode } from "@/lib/analytics/ask-errors";
import type { DataAvailability } from "@/lib/analytics/ask-guardrails";

export interface AnalyticsAskAuditEntry {
  at: string;
  userId: string;
  promptLength: number;
  parseSource: ParseSource | "none";
  parseConfidence: ParseConfidence | "none";
  dataAvailability: DataAvailability | "none";
  status: "success" | "confirmation_required" | "no_data" | "error";
  errorCode?: AnalyticsAskErrorCode;
  durationMs: number;
  inputTokens?: number;
  outputTokens?: number;
  reportInputTokens?: number;
  reportOutputTokens?: number;
}

// Gemini Flash pricing as of 2025 (per million tokens, input/output)
const COST_PER_M_INPUT  = 0.075;
const COST_PER_M_OUTPUT = 0.30;

function estimateCostUsd(inputTokens?: number, outputTokens?: number): number | null {
  if (!inputTokens && !outputTokens) return null;
  const input  = ((inputTokens  ?? 0) / 1_000_000) * COST_PER_M_INPUT;
  const output = ((outputTokens ?? 0) / 1_000_000) * COST_PER_M_OUTPUT;
  return Math.round((input + output) * 1_000_000) / 1_000_000; // 6 decimal places
}

/**
 * Persists an analytics ask audit entry to the DB.
 * Fire-and-forget — never throws, falls back to console on DB error.
 */
export function logAnalyticsAskAudit(entry: AnalyticsAskAuditEntry): void {
  const logPayload = {
    event: "analytics_ask",
    ...entry,
  };

  if (entry.status === "error") {
    console.warn("[analytics-ask-audit]", JSON.stringify(logPayload));
  } else {
    console.info("[analytics-ask-audit]", JSON.stringify(logPayload));
  }

  // Persist to DB non-blocking — wrapped in void so it never blocks the ask response.
  void persistAuditEntry(entry);
}

async function persistAuditEntry(entry: AnalyticsAskAuditEntry): Promise<void> {
  try {
    const parseInput = entry.inputTokens ?? null;
    const parseOutput = entry.outputTokens ?? null;
    const reportInput = entry.reportInputTokens ?? null;
    const reportOutput = entry.reportOutputTokens ?? null;
    const totalInput = (parseInput ?? 0) + (reportInput ?? 0);
    const totalOutput = (parseOutput ?? 0) + (reportOutput ?? 0);

    await prisma.analyticsAskLog.create({
      data: {
        appUserId: entry.userId,
        promptLength: entry.promptLength,
        parseSource: entry.parseSource,
        parseConfidence: entry.parseConfidence,
        dataAvailability: entry.dataAvailability,
        status: entry.status,
        errorCode: entry.errorCode ?? null,
        durationMs: entry.durationMs,
        intentTokensIn: parseInput,
        intentTokensOut: parseOutput,
        reportTokensIn: reportInput,
        reportTokensOut: reportOutput,
        totalCostUsd: estimateCostUsd(
          totalInput > 0 ? totalInput : undefined,
          totalOutput > 0 ? totalOutput : undefined,
        ),
      },
    });
  } catch (err) {
    // DB write failure is non-fatal — console fallback already logged above.
    console.warn("[analytics-ask-audit] DB persist failed", err);
  }
}

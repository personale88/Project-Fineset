/**
 * Streaming AI narrative report generator.
 *
 * Sends a compact summary (~150–200 tokens) plus the user's original question
 * to Gemini Flash and yields the response as a streaming async generator.
 *
 * The structured JSON response is parsed when the stream ends to produce
 * the final AnalyticsAskReport (summary, highlights, recommendations).
 */

import { geminiStreamContent } from "@/lib/gemini/generate-content";
import { buildHonestyContext } from "@/lib/analytics/data-honesty";
import { compressSummary, serializeSummary } from "@/lib/analytics/summary-compressor";
import {
  tokenUsageFromGeminiMetadata,
  type TokenUsage,
} from "@/lib/analytics/token-estimate";
import type { AdminBusinessAnalytics } from "@/types/admin-business-analytics";
import type { AnalyticsAskReport } from "@/types/admin-business-analytics-ask";

// ---------------------------------------------------------------------------
// System prompt (~280 tokens, consistent across all asks)
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a senior retail analytics advisor for Indian jewelry stores.
You receive a compact analytics JSON summary and a user question.

Rules:
- Cite actual numbers from the data. Do not invent figures.
- If totalVisits < 5, state that data is insufficient for reliable conclusions.
- If comparing periods, lead with the delta direction and magnitude (e.g. "Revenue grew 23% vs last year").
- Reference specific staff names, product categories, or channels from the data when present.
- If a requested metric has no data (null or 0), say so honestly rather than speculating.
- Keep language clear, concise, and professional — no marketing fluff.
- If the DATA QUALITY block shows totalVisits < 10, your summary MUST begin with a caveat about insufficient data.
- If dailyTrend is present in the JSON, use those daily figures when answering trend or over-time questions.

Return ONLY a valid JSON object with this exact shape:
{
  "summary": "2–3 sentence narrative answering the user's question",
  "highlights": ["key finding 1", "key finding 2", "key finding 3"],
  "recommendations": ["action 1", "action 2"]
}

Do not include any text outside the JSON object.`;

export const AI_REPORT_PARSE_FALLBACK_SUMMARY =
  "Unable to generate AI analysis. Please try again.";

// ---------------------------------------------------------------------------
// Public streaming generator
// ---------------------------------------------------------------------------

/**
 * Streams an AI-generated analytics report as text chunks.
 *
 * @yields Raw text tokens from Gemini (partial JSON strings)
 * @returns The accumulated full text after the generator is exhausted
 */
export interface StreamAiReportOptions {
  includeDailyTrend?: boolean;
}

export async function* streamAiReport(
  analytics: AdminBusinessAnalytics,
  userQuestion: string,
  apiKey: string,
  options?: StreamAiReportOptions,
): AsyncGenerator<string, TokenUsage | null> {
  const compressed = compressSummary(analytics, {
    includeDailyTrend: options?.includeDailyTrend,
  });
  const honestyContext = buildHonestyContext(analytics);
  const summaryJson = serializeSummary(compressed);

  const userPrompt = `${honestyContext}

[ANALYTICS DATA]
${summaryJson}

[USER QUESTION]
${userQuestion.trim()}`;

  const generator = geminiStreamContent(apiKey, userPrompt, {
    systemInstruction: SYSTEM_PROMPT,
    maxOutputTokens: 1024,
    temperature: 0.3,
    responseMimeType: "application/json",
  });

  while (true) {
    const { value, done } = await generator.next();
    if (done) {
      return tokenUsageFromGeminiMetadata(
        value?.promptTokenCount,
        value?.candidatesTokenCount,
      );
    }
    yield value;
  }
}

// ---------------------------------------------------------------------------
// Report parser — converts accumulated JSON string to AnalyticsAskReport
// ---------------------------------------------------------------------------

export interface ParseAiReportResult {
  report: AnalyticsAskReport;
  ok: boolean;
}

function stripMarkdownJsonFence(rawText: string): string {
  const trimmed = rawText.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

function extractJsonObject(rawText: string): string | null {
  const cleaned = stripMarkdownJsonFence(rawText);
  if (!cleaned) return null;
  if (cleaned.startsWith("{")) return cleaned;

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  return jsonMatch?.[0] ?? null;
}

function normalizeParsedReport(parsed: {
  summary?: unknown;
  highlights?: unknown;
  recommendations?: unknown;
}): AnalyticsAskReport | null {
  const summary = typeof parsed.summary === "string" ? parsed.summary.trim() : "";
  if (!summary) return null;

  return {
    summary,
    highlights: Array.isArray(parsed.highlights)
      ? parsed.highlights.filter((h): h is string => typeof h === "string" && h.trim().length > 0)
      : [],
    recommendations: Array.isArray(parsed.recommendations)
      ? parsed.recommendations.filter((r): r is string => typeof r === "string" && r.trim().length > 0)
      : [],
    dataAvailability: "ok",
  };
}

export function parseAiReportJson(rawText: string): ParseAiReportResult {
  const jsonText = extractJsonObject(rawText);
  if (!jsonText) {
    return { report: fallbackReport(), ok: false };
  }

  try {
    const parsed = JSON.parse(jsonText) as {
      summary?: unknown;
      highlights?: unknown;
      recommendations?: unknown;
    };
    const report = normalizeParsedReport(parsed);
    if (!report) {
      return { report: fallbackReport(), ok: false };
    }
    return { report, ok: true };
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[analytics-ask-report] JSON parse failed:",
        error instanceof Error ? error.message : error,
        jsonText.slice(0, 200),
      );
    }
    return { report: fallbackReport(), ok: false };
  }
}

function fallbackReport(): AnalyticsAskReport {
  return {
    summary: AI_REPORT_PARSE_FALLBACK_SUMMARY,
    highlights: [],
    recommendations: [],
    dataAvailability: "ok",
  };
}

// ---------------------------------------------------------------------------
// Token estimation helper
// ---------------------------------------------------------------------------

export function estimateAiReportTokens(analytics: AdminBusinessAnalytics): {
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
} {
  // System prompt ~280 tokens + compressed summary ~175 tokens + question ~30 tokens
  const compressed = compressSummary(analytics);
  const summaryTokens = Math.ceil(serializeSummary(compressed).length / 4);
  return {
    estimatedInputTokens: 280 + summaryTokens + 30,
    estimatedOutputTokens: 300,
  };
}

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

Return ONLY a valid JSON object with this exact shape:
{
  "summary": "2–3 sentence narrative answering the user's question",
  "highlights": ["key finding 1", "key finding 2", "key finding 3"],
  "recommendations": ["action 1", "action 2"]
}

Do not include any text outside the JSON object.`;

// ---------------------------------------------------------------------------
// Public streaming generator
// ---------------------------------------------------------------------------

/**
 * Streams an AI-generated analytics report as text chunks.
 *
 * @yields Raw text tokens from Gemini (partial JSON strings)
 * @returns The accumulated full text after the generator is exhausted
 */
export async function* streamAiReport(
  analytics: AdminBusinessAnalytics,
  userQuestion: string,
  apiKey: string,
): AsyncGenerator<string, TokenUsage | null> {
  const compressed = compressSummary(analytics);
  const honestyContext = buildHonestyContext(analytics);
  const summaryJson = serializeSummary(compressed);

  const userPrompt = `${honestyContext}

[ANALYTICS DATA]
${summaryJson}

[USER QUESTION]
${userQuestion.trim()}`;

  const generator = geminiStreamContent(apiKey, userPrompt, {
    systemInstruction: SYSTEM_PROMPT,
    maxOutputTokens: 600,
    temperature: 0.4,
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

export function parseAiReportJson(rawText: string): AnalyticsAskReport {
  // Extract JSON object from accumulated stream (may have surrounding whitespace)
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return fallbackReport();

  try {
    const parsed = JSON.parse(jsonMatch[0]) as {
      summary?: string;
      highlights?: unknown[];
      recommendations?: unknown[];
    };

    return {
      summary: typeof parsed.summary === "string" ? parsed.summary.trim() : "",
      highlights: Array.isArray(parsed.highlights)
        ? parsed.highlights.filter((h): h is string => typeof h === "string")
        : [],
      recommendations: Array.isArray(parsed.recommendations)
        ? parsed.recommendations.filter((r): r is string => typeof r === "string")
        : [],
      dataAvailability: "ok",
    };
  } catch {
    return fallbackReport();
  }
}

function fallbackReport(): AnalyticsAskReport {
  return {
    summary: "Unable to generate AI analysis. Please try again.",
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

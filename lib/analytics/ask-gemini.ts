import {
  geminiGenerateContent,
  isGeminiApiKeyConfigured,
} from "@/lib/gemini/generate-content";
import { AnalyticsAskError } from "@/lib/analytics/ask-errors";
import { analyticsAskIntentSchema } from "@/lib/validations/admin-business-analytics-ask.schema";
import type { ParsedAnalyticsAskIntent } from "@/lib/validations/admin-business-analytics-ask.schema";
import type { TokenUsage } from "@/lib/analytics/token-estimate";
import { tokenUsageFromGeminiMetadata } from "@/lib/analytics/token-estimate";
import { ANALYTICS_ASK_MAX_OUTPUT_TOKENS } from "@/lib/analytics/token-estimate";

export function isGeminiConfigured(): boolean {
  return isGeminiApiKeyConfigured();
}

const INTENT_SYSTEM = `You translate jewelry retail analytics questions into JSON only.
Return a single JSON object matching this shape:
{
  "dateMode": "preset"|"range"|"day"|"month"|"compare",
  "period": "today"|"yesterday"|"week"|"month"|"last30days"|"last3months"|"last6months" (optional),
  "month": 1-12 (optional),
  "year": number (optional),
  "compareAMonth", "compareAYear", "compareBMonth", "compareBYear" (optional, for compare mode),
  "rollingMonths": 1-24 (optional, for "last N months" e.g. last 10 months),
  "rollingDays": 1-366 (optional, for "last N days" e.g. last 45 days),
  "chartTypes": optional array of "line"|"area"|"bar"|"rankedBar"|"stackedBar"|"groupedBar"|"pie"|"comparison"|"radar" — only when the user names a chart; otherwise [],
  "breakdownDimension": one of customerType|valueTier|intentTier|purchaseStatus|sourceChannel|gender|ageGroup|area|visitType|budgetRange|productCategory|schemeProduct|enrollmentOutcome,
  "activeFilters": string[],
  "segment": "ALL"|"NEW"|"RETAINED"|"PURCHASED"|"NOT_PURCHASED" (optional),
  "valueTier": "ALL"|"HIGH"|"MID"|"LOW" (optional),
  "customerType": "NEW"|"REPEAT"|"VIP" (optional),
  "productCategory": optional product enum,
  "area": optional string
}
No markdown. No explanation.`;

export interface GeminiIntentParseResult {
  intent: ParsedAnalyticsAskIntent;
  tokenUsage: TokenUsage | null;
}

function extractJsonObject(text: string): unknown {
  const jsonStart = text.indexOf("{");
  const jsonEnd = text.lastIndexOf("}");
  if (jsonStart < 0 || jsonEnd < 0) {
    throw new AnalyticsAskError(
      "GEMINI_PARSE_FAILED",
      "Gemini returned a response we could not parse as JSON. Try rephrasing or use a recommendation prompt.",
      422,
    );
  }
  try {
    return JSON.parse(text.slice(jsonStart, jsonEnd + 1));
  } catch {
    throw new AnalyticsAskError(
      "GEMINI_PARSE_FAILED",
      "Gemini returned invalid JSON for your question. Try a shorter, more specific prompt.",
      422,
    );
  }
}

export async function parseIntentWithGemini(prompt: string): Promise<GeminiIntentParseResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new AnalyticsAskError(
      "GEMINI_NOT_CONFIGURED",
      "Gemini is not configured. Add GEMINI_API_KEY to enable AI intent parsing, or use a recommendation prompt.",
      503,
    );
  }

  const result = await geminiGenerateContent(
    apiKey,
    `${INTENT_SYSTEM}\n\nUser question:\n${prompt}`,
    {
      maxOutputTokens: ANALYTICS_ASK_MAX_OUTPUT_TOKENS,
      temperature: 0.1,
      responseMimeType: "application/json",
    },
  );

  if (!result.text) {
    const detail = result.httpStatus === 429
      ? "Gemini rate limit reached. Wait a moment and try again."
      : result.httpStatus === 403
        ? "Gemini API key is invalid or lacks permission."
        : "Gemini did not return a usable response.";

    throw new AnalyticsAskError(
      result.httpStatus === 429 ? "GEMINI_UNAVAILABLE" : "GEMINI_PARSE_FAILED",
      detail,
      result.httpStatus === 429 ? 429 : 502,
    );
  }

  const parsed = analyticsAskIntentSchema.safeParse(extractJsonObject(result.text));
  if (!parsed.success) {
    throw new AnalyticsAskError(
      "GEMINI_PARSE_FAILED",
      "Gemini understood your question but returned an unsupported query shape. Try rephrasing with a clear time range and metric.",
      422,
    );
  }

  return {
    intent: parsed.data,
    tokenUsage: tokenUsageFromGeminiMetadata(
      result.usageMetadata?.promptTokenCount,
      result.usageMetadata?.candidatesTokenCount,
      result.model,
    ),
  };
}

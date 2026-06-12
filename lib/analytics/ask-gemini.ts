import { analyticsAskIntentSchema } from "@/lib/validations/admin-business-analytics-ask.schema";
import type { ParsedAnalyticsAskIntent } from "@/lib/validations/admin-business-analytics-ask.schema";
import type { AnalyticsAskReport } from "@/types/admin-business-analytics-ask";
import type { AdminBusinessAnalytics } from "@/types/admin-business-analytics";

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

export async function parseIntentWithGemini(
  prompt: string,
): Promise<ParsedAnalyticsAskIntent | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;

  const system = `You translate jewelry retail analytics questions into JSON only.
Return a single JSON object matching this shape:
{
  "dateMode": "preset"|"range"|"day"|"month"|"compare",
  "period": "today"|"yesterday"|"week"|"month"|"last3months"|"last6months" (optional),
  "month": 1-12 (optional),
  "year": number (optional),
  "compareAMonth", "compareAYear", "compareBMonth", "compareBYear" (optional, for compare mode),
  "chartTypes": optional array of "line"|"bar"|"pie"|"comparison"|"radar" — only when the user names a chart; otherwise [] and charts are chosen from data,
  "breakdownDimension": one of customerType|valueTier|intentTier|purchaseStatus|sourceChannel|gender|ageGroup|area|visitType|budgetRange|productCategory|schemeProduct|enrollmentOutcome,
  "activeFilters": string[],
  "segment": "ALL"|"NEW"|"RETAINED"|"PURCHASED"|"NOT_PURCHASED" (optional),
  "valueTier": "ALL"|"HIGH"|"MID"|"LOW" (optional),
  "customerType": "NEW"|"REPEAT"|"VIP" (optional),
  "productCategory": optional product enum,
  "area": optional string
}
No markdown. No explanation.`;

  const text = await geminiGenerate(apiKey, `${system}\n\nUser question:\n${prompt}`);
  if (!text) return null;

  try {
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart < 0 || jsonEnd < 0) return null;
    const parsed = analyticsAskIntentSchema.safeParse(
      JSON.parse(text.slice(jsonStart, jsonEnd + 1)),
    );
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function generateReportWithGemini(
  prompt: string,
  analytics: AdminBusinessAnalytics,
  interpretedQuery: string,
): Promise<AnalyticsAskReport | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;

  const payload = {
    period: analytics.period.label,
    summary: analytics.summary,
    comparison: analytics.comparison
      ? {
          period: analytics.comparison.period.label,
          summary: analytics.comparison.summary,
          deltas: analytics.comparison.deltas,
        }
      : null,
    topCustomerTypes: analytics.breakdowns.customerType.slice(0, 5),
    topSources: analytics.breakdowns.sourceChannel.slice(0, 5),
    topProducts: analytics.breakdowns.productsExplored.slice(0, 5),
  };

  const instruction = `You are a jewelry retail analytics advisor for Indian stores (GHS/GPP schemes).
Given the user question and computed metrics JSON, respond with JSON only:
{
  "summary": "2-3 sentence executive summary",
  "highlights": ["3-5 bullet insights as strings"],
  "recommendations": ["3-5 actionable recommendations as strings"]
}
Be specific with numbers from the data. No markdown.`;

  const text = await geminiGenerate(
    apiKey,
    `${instruction}\n\nUser question: ${prompt}\nInterpreted: ${interpretedQuery}\nData:\n${JSON.stringify(payload)}`,
  );
  if (!text) return null;

  try {
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart < 0 || jsonEnd < 0) return null;
    const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as AnalyticsAskReport;
    if (!parsed.summary || !Array.isArray(parsed.highlights)) return null;
    return {
      summary: String(parsed.summary),
      highlights: parsed.highlights.map(String).slice(0, 6),
      recommendations: (parsed.recommendations ?? []).map(String).slice(0, 6),
    };
  } catch {
    return null;
  }
}

async function geminiGenerate(apiKey: string, prompt: string): Promise<string | null> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 1024, temperature: 0.2 },
      }),
    },
  );

  if (!response.ok) return null;

  const json = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? null;
}

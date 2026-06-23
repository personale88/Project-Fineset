import { geminiGenerateContent } from "@/lib/gemini/generate-content";

const THEME_PATTERNS: Array<{ key: string; label: string; pattern: RegExp }> = [
  { key: "price", label: "Price / budget", pattern: /\b(price|budget|cost|expensive|discount)\b/i },
  { key: "design", label: "Design / style", pattern: /\b(design|style|pattern|look)\b/i },
  { key: "timing", label: "Timing / callback", pattern: /\b(call back|later|busy|tomorrow|next week)\b/i },
  { key: "interest", label: "Interest / intent", pattern: /\b(interested|want|consider|maybe)\b/i },
  { key: "no_answer", label: "Unreachable", pattern: /\b(no answer|not answering|rang|busy tone)\b/i },
  { key: "visit", label: "Store visit", pattern: /\b(visit|come to store|walk-?in)\b/i },
  { key: "scheme", label: "Scheme / GHS / JPP", pattern: /\b(ghs|gpp|jpp|scheme|plan|installment)\b/i },
];

export interface CallNotesInsightsInput {
  feedbackSnippets: string[];
}

export interface CallNotesInsightsResult {
  themes: Array<{ key: string; label: string; count: number }>;
  recentSnippets: string[];
  aiSummary: string | null;
  aiSummaryAvailable: boolean;
}

export function extractCallNoteThemes(feedbackSnippets: string[]): CallNotesInsightsResult["themes"] {
  const counts = new Map<string, { label: string; count: number }>();

  for (const snippet of feedbackSnippets) {
    const normalized = snippet.trim();
    if (!normalized) continue;

    for (const { key, label, pattern } of THEME_PATTERNS) {
      if (!pattern.test(normalized)) continue;
      const existing = counts.get(key) ?? { label, count: 0 };
      existing.count += 1;
      counts.set(key, existing);
    }
  }

  return Array.from(counts.entries())
    .map(([key, { label, count }]) => ({ key, label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

export async function buildCallNotesInsights(
  input: CallNotesInsightsInput,
): Promise<CallNotesInsightsResult> {
  const snippets = input.feedbackSnippets
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .slice(0, 40);

  const themes = extractCallNoteThemes(snippets);
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const aiSummaryAvailable = Boolean(apiKey);

  let aiSummary: string | null = null;
  if (apiKey && snippets.length >= 3) {
    aiSummary = await fetchGeminiCallSummary(apiKey, snippets).catch(() => null);
  }

  return {
    themes,
    recentSnippets: snippets.slice(0, 6),
    aiSummary,
    aiSummaryAvailable,
  };
}

async function fetchGeminiCallSummary(
  apiKey: string,
  snippets: string[],
): Promise<string | null> {
  const prompt = [
    "Summarize these jewelry store staff call notes in 2-3 short sentences for a store manager.",
    "Focus on customer objections, follow-up timing, and buying signals.",
    "Notes:",
    ...snippets.map((s, i) => `${i + 1}. ${s}`),
  ].join("\n");

  const result = await geminiGenerateContent(apiKey, prompt, {
    maxOutputTokens: 256,
    temperature: 0.3,
  });
  return result.text;
}

import { geminiGenerateContent } from "@/lib/gemini/generate-content";

const THEME_PATTERNS: Array<{ key: string; label: string; pattern: RegExp }> = [
  { key: "budget", label: "Budget / affordability", pattern: /\b(budget|afford|expensive|cost|price)\b/i },
  { key: "trust", label: "Trust / credibility", pattern: /\b(trust|credib|reputation|brand)\b/i },
  { key: "timing", label: "Needs time", pattern: /\b(later|think|time|next month|tomorrow)\b/i },
  { key: "competitor", label: "Competitor mention", pattern: /\b(tanishq|caratlane|competitor|other store)\b/i },
  { key: "interest", label: "Interest / intent", pattern: /\b(interested|want|consider|maybe|keen)\b/i },
  { key: "scheme", label: "Scheme details", pattern: /\b(ghs|gpp|scheme|installment|plan|commitment)\b/i },
  { key: "referral", label: "Referral / neighbour", pattern: /\b(refer|neighbour|neighbor|society|friend)\b/i },
  { key: "visit", label: "Store visit planned", pattern: /\b(visit store|walk-?in|come to shop)\b/i },
];

export interface FieldNotesInsightsInput {
  noteSnippets: string[];
}

export interface FieldNotesInsightsResult {
  themes: Array<{ key: string; label: string; count: number }>;
  recentSnippets: string[];
  aiSummary: string | null;
  aiSummaryAvailable: boolean;
}

export function extractFieldNoteThemes(
  snippets: string[],
): FieldNotesInsightsResult["themes"] {
  const counts = new Map<string, { label: string; count: number }>();

  for (const snippet of snippets) {
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

export async function buildFieldNotesInsights(
  input: FieldNotesInsightsInput,
): Promise<FieldNotesInsightsResult> {
  const snippets = input.noteSnippets
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .slice(0, 40);

  const themes = extractFieldNoteThemes(snippets);
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const aiSummaryAvailable = Boolean(apiKey);

  let aiSummary: string | null = null;
  if (apiKey && snippets.length >= 3) {
    aiSummary = await fetchGeminiFieldSummary(apiKey, snippets).catch(() => null);
  }

  return {
    themes,
    recentSnippets: snippets.slice(0, 6),
    aiSummary,
    aiSummaryAvailable,
  };
}

async function fetchGeminiFieldSummary(
  apiKey: string,
  snippets: string[],
): Promise<string | null> {
  const prompt = [
    "Summarize these jewelry store field sales notes in 2-3 short sentences for a store manager.",
    "Focus on enrollment objections, scheme interest, follow-up timing, and area feedback.",
    "Notes:",
    ...snippets.map((s, i) => `${i + 1}. ${s}`),
  ].join("\n");

  return geminiGenerateContent(apiKey, prompt, {
    maxOutputTokens: 256,
    temperature: 0.3,
  });
}

/** Gemini 2.5 Flash list pricing (USD per 1M tokens) — update when Google changes rates. */
export const GEMINI_FLASH_INPUT_USD_PER_M = 0.075;
export const GEMINI_FLASH_OUTPUT_USD_PER_M = 0.3;

export const ANALYTICS_ASK_MAX_OUTPUT_TOKENS = 1024;
export const ANALYTICS_ASK_INTENT_SYSTEM_CHARS = 1800;
export const ANALYTICS_ASK_REPORT_MAX_OUTPUT_TOKENS = 0;

export interface TokenEstimate {
  inputTokens: number;
  outputTokensBudget: number;
  totalTokensBudget: number;
  estimatedCostUsd: number;
  model: string;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  model: string;
}

export function estimateTokenCount(text: string): number {
  if (!text.trim()) return 0;
  return Math.ceil(text.length / 4);
}

export function estimateAnalyticsAskTokens(
  userPrompt: string,
  options?: {
    includeReport?: boolean;
    model?: string;
  },
): TokenEstimate {
  const model = options?.model ?? "gemini-2.5-flash";
  const inputTokens =
    estimateTokenCount(userPrompt) +
    estimateTokenCount("x".repeat(ANALYTICS_ASK_INTENT_SYSTEM_CHARS));
  const outputTokensBudget = options?.includeReport
    ? ANALYTICS_ASK_MAX_OUTPUT_TOKENS
    : ANALYTICS_ASK_MAX_OUTPUT_TOKENS;
  const totalTokensBudget = inputTokens + outputTokensBudget;
  const estimatedCostUsd =
    (inputTokens / 1_000_000) * GEMINI_FLASH_INPUT_USD_PER_M +
    (outputTokensBudget / 1_000_000) * GEMINI_FLASH_OUTPUT_USD_PER_M;

  return {
    inputTokens,
    outputTokensBudget,
    totalTokensBudget,
    estimatedCostUsd: roundUsd(estimatedCostUsd),
    model,
  };
}

export function mergeTokenUsage(
  a: TokenUsage | null | undefined,
  b: TokenUsage | null | undefined,
): TokenUsage | null {
  if (!a && !b) return null;
  if (!a) return b ?? null;
  if (!b) return a;

  const inputTokens = a.inputTokens + b.inputTokens;
  const outputTokens = a.outputTokens + b.outputTokens;
  const totalTokens = inputTokens + outputTokens;
  const estimatedCostUsd =
    (inputTokens / 1_000_000) * GEMINI_FLASH_INPUT_USD_PER_M +
    (outputTokens / 1_000_000) * GEMINI_FLASH_OUTPUT_USD_PER_M;

  return {
    inputTokens,
    outputTokens,
    totalTokens,
    estimatedCostUsd: roundUsd(estimatedCostUsd),
    model: a.model || b.model,
  };
}

export function tokenUsageFromGeminiMetadata(
  promptTokenCount: number | undefined,
  candidatesTokenCount: number | undefined,
  model = "gemini-2.5-flash",
): TokenUsage | null {
  if (promptTokenCount == null && candidatesTokenCount == null) return null;

  const inputTokens = promptTokenCount ?? 0;
  const outputTokens = candidatesTokenCount ?? 0;
  const totalTokens = inputTokens + outputTokens;
  const estimatedCostUsd =
    (inputTokens / 1_000_000) * GEMINI_FLASH_INPUT_USD_PER_M +
    (outputTokens / 1_000_000) * GEMINI_FLASH_OUTPUT_USD_PER_M;

  return {
    inputTokens,
    outputTokens,
    totalTokens,
    estimatedCostUsd: roundUsd(estimatedCostUsd),
    model,
  };
}

function roundUsd(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function formatTokenCount(count: number): string {
  return count.toLocaleString("en-IN");
}

export function formatUsdCost(usd: number): string {
  if (usd === 0) return "$0.00";
  if (usd < 0.01) return `< $0.01`;
  return `$${usd.toFixed(usd < 0.1 ? 3 : 2)}`;
}

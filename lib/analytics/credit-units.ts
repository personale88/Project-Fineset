/** One credit covers roughly this many Gemini tokens for billing display. */
export const TOKENS_PER_CREDIT = 1_000;

export const MIN_CREDITS_PER_ASK = 1;

export interface AnalyticsCreditPack {
  id: string;
  label: string;
  credits: number;
  priceInr: number;
  description: string;
  bestFor: string;
}

export const ANALYTICS_CREDIT_PACKS: AnalyticsCreditPack[] = [
  {
    id: "starter",
    label: "Starter",
    credits: 50,
    priceInr: 499,
    description: "About 50 AI analyses for a single store.",
    bestFor: "Trying analytics on one store",
  },
  {
    id: "growth",
    label: "Growth",
    credits: 200,
    priceInr: 1499,
    description: "About 200 analyses with Gemini intent parsing.",
    bestFor: "Weekly portfolio reviews",
  },
  {
    id: "portfolio",
    label: "Portfolio",
    credits: 500,
    priceInr: 2999,
    description: "About 500 analyses across your full portfolio.",
    bestFor: "Heavy admin usage and comparisons",
  },
];

export function getAnalyticsCreditPack(packId: string): AnalyticsCreditPack | undefined {
  return ANALYTICS_CREDIT_PACKS.find((pack) => pack.id === packId);
}

export function creditsForTokenUsage(
  tokensUsed: number | null | undefined,
  tokensPerCredit: number = TOKENS_PER_CREDIT,
): number {
  if (!tokensUsed || tokensUsed <= 0) return MIN_CREDITS_PER_ASK;
  return Math.max(MIN_CREDITS_PER_ASK, Math.ceil(tokensUsed / tokensPerCredit));
}

export function formatCredits(count: number): string {
  return count.toLocaleString("en-IN");
}

export function estimateCreditsForPrompt(prompt: string): number {
  const estimatedTokens = Math.ceil(prompt.length / 4) + 500;
  return creditsForTokenUsage(estimatedTokens);
}

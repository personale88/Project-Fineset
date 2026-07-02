"use client";

import { Coins } from "lucide-react";
import {
  estimateAnalyticsAskTokens,
  formatTokenCount,
  formatUsdCost,
} from "@/lib/analytics/token-estimate";
import type { TokenUsage } from "@/lib/analytics/token-estimate";
import type { Content } from "@/content/en";

type TokenCopy = Content["admin"]["analytics"]["ask"]["tokenUsage"];

interface AnalyticsTokenEstimateProps {
  copy: TokenCopy;
  prompt: string;
  geminiConfigured: boolean;
  usage?: TokenUsage | null;
}

export function AnalyticsTokenEstimate({
  copy,
  prompt,
  geminiConfigured,
  usage,
}: AnalyticsTokenEstimateProps) {
  const estimate = estimateAnalyticsAskTokens(prompt);

  if (!geminiConfigured && !usage) {
    return (
      <p className="text-xs text-text-muted">{copy.rulesOnlyNote}</p>
    );
  }

  if (usage) {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
        <span className="inline-flex items-center gap-1.5 font-medium text-text-muted">
          <Coins className="h-3.5 w-3.5 text-brand-gold" aria-hidden />
          {copy.actualTitle}
        </span>
        <span>
          {copy.input}: {formatTokenCount(usage.inputTokens)}
        </span>
        <span>
          {copy.output}: {formatTokenCount(usage.outputTokens)}
        </span>
        <span>
          {copy.total}: {formatTokenCount(usage.totalTokens)}
        </span>
        <span className="font-medium text-text-muted">
          {copy.cost}: {formatUsdCost(usage.estimatedCostUsd)}
        </span>
        <span className="text-text-muted/80">({usage.model})</span>
      </div>
    );
  }

  if (prompt.trim().length < 3) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
      <span className="inline-flex items-center gap-1.5 font-medium text-text-muted">
        <Coins className="h-3.5 w-3.5 text-brand-gold" aria-hidden />
        {copy.estimateTitle}
      </span>
      <span>
        {copy.input}: ~{formatTokenCount(estimate.inputTokens)}
      </span>
      <span>
        {copy.budget}: ~{formatTokenCount(estimate.outputTokensBudget)}
      </span>
      <span>
        {copy.total}: ~{formatTokenCount(estimate.totalTokensBudget)}
      </span>
      <span className="font-medium text-text-muted">
        {copy.cost}: ~{formatUsdCost(estimate.estimatedCostUsd)}
      </span>
      <span className="text-text-muted/80">({estimate.model})</span>
    </div>
  );
}

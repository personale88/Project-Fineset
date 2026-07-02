import { describe, expect, it } from "vitest";
import {
  requiresParseConfirmation,
  scoreRuleParseConfidence,
} from "@/lib/analytics/ask-confidence";
import { parseAnalyticsAskIntent } from "@/lib/analytics/ask-intent-parser";
import {
  assessDataAvailability,
  emptyDataReportMessage,
  isOutOfScopeAnalyticsPrompt,
  outOfScopeMessage,
  sparseDataReportMessage,
} from "@/lib/analytics/ask-guardrails";
import { estimateAnalyticsAskTokens } from "@/lib/analytics/token-estimate";

describe("ask guardrails", () => {
  it("flags clearly out-of-scope prompts", () => {
    expect(isOutOfScopeAnalyticsPrompt("What's the weather in Mumbai?")).toBe(true);
    expect(isOutOfScopeAnalyticsPrompt("Last 30 days revenue by source")).toBe(false);
  });

  it("returns honest out-of-scope guidance", () => {
    expect(outOfScopeMessage()).toMatch(/outside what FineSet analytics can answer/i);
  });

  it("classifies data availability", () => {
    expect(assessDataAvailability(0)).toBe("empty");
    expect(assessDataAvailability(3)).toBe("sparse");
    expect(assessDataAvailability(42)).toBe("ok");
  });

  it("builds honest empty and sparse messages", () => {
    expect(emptyDataReportMessage("Last 30 days", "Heritage Jewellers")).toMatch(
      /No visits were logged/,
    );
    expect(sparseDataReportMessage(2, "This month")).toMatch(/Only 2 visits/);
  });
});

describe("ask confidence", () => {
  it("requires confirmation for low-confidence rule parses", () => {
    const intent = parseAnalyticsAskIntent("customers");
    const confidence = scoreRuleParseConfidence("customers", intent);
    expect(confidence).toBe("low");
    expect(requiresParseConfirmation(confidence, "rules")).toBe(true);
  });

  it("skips confirmation for high-confidence rule parses", () => {
    const prompt = "Compare this month vs last year revenue by customer type";
    const intent = parseAnalyticsAskIntent(prompt);
    const confidence = scoreRuleParseConfidence(prompt, intent);
    expect(confidence).toBe("high");
    expect(requiresParseConfirmation(confidence, "rules")).toBe(false);
  });

  it("requires confirmation for low gemini confidence only", () => {
    expect(requiresParseConfirmation("high", "gemini")).toBe(false);
    expect(requiresParseConfirmation("low", "gemini")).toBe(true);
  });
});

describe("token estimate", () => {
  it("estimates non-zero tokens for a typical prompt", () => {
    const estimate = estimateAnalyticsAskTokens(
      "Last 30 days revenue trend by visit source",
    );
    expect(estimate.inputTokens).toBeGreaterThan(400);
    expect(estimate.outputTokensBudget).toBeGreaterThan(0);
    expect(estimate.estimatedCostUsd).toBeGreaterThan(0);
  });
});

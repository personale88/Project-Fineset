import { describe, expect, it } from "vitest";
import { mergeTokenUsage } from "@/lib/analytics/token-estimate";

describe("mergeTokenUsage", () => {
  it("returns null when both usages are missing", () => {
    expect(mergeTokenUsage(null, null)).toBeNull();
  });

  it("returns the other usage when one is missing", () => {
    const parse = {
      inputTokens: 100,
      outputTokens: 50,
      totalTokens: 150,
      estimatedCostUsd: 0.01,
      model: "gemini-2.5-flash",
    };

    expect(mergeTokenUsage(parse, null)).toEqual(parse);
    expect(mergeTokenUsage(null, parse)).toEqual(parse);
  });

  it("sums parse and report token counts", () => {
    const parse = {
      inputTokens: 100,
      outputTokens: 20,
      totalTokens: 120,
      estimatedCostUsd: 0.01,
      model: "gemini-2.5-flash",
    };
    const report = {
      inputTokens: 300,
      outputTokens: 80,
      totalTokens: 380,
      estimatedCostUsd: 0.05,
      model: "gemini-2.5-flash",
    };

    expect(mergeTokenUsage(parse, report)).toMatchObject({
      inputTokens: 400,
      outputTokens: 100,
      totalTokens: 500,
      model: "gemini-2.5-flash",
    });
  });
});

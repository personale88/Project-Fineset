import { describe, expect, it } from "vitest";
import {
  describeParsedIntent,
  parseAnalyticsAskIntent,
} from "@/lib/analytics/ask-intent-parser";
import { scoreRuleParseConfidence } from "@/lib/analytics/ask-confidence";
import { getPeriodRange } from "@/lib/utils/analytics";
import {
  formatPresetPeriodLabel,
  getRollingMonthsRange,
} from "@/lib/utils/analytics-date-range";

describe("parseAnalyticsAskIntent", () => {
  it("maps last 30 days prompts to last30days period", () => {
    const intent = parseAnalyticsAskIntent(
      "Last 30 days performance snapshot and revenue trend",
    );
    expect(intent.period).toBe("last30days");
    expect(intent.dateMode).toBe("preset");
  });

  it("maps this month prompts to calendar month period", () => {
    const intent = parseAnalyticsAskIntent("Revenue this month by source");
    expect(intent.period).toBe("month");
  });

  it("defaults unmatched prompts to last30days", () => {
    const intent = parseAnalyticsAskIntent("Show me customer breakdown");
    expect(intent.period).toBe("last30days");
  });

  it("maps last 10 months to rollingMonths", () => {
    const intent = parseAnalyticsAskIntent(
      "Retained customers last 10 months by customer type",
    );
    expect(intent.rollingMonths).toBe(10);
    expect(intent.period).toBeUndefined();
    expect(intent.segment).toBe("RETAINED");
    expect(intent.breakdownDimension).toBe("customerType");
  });

  it("maps last 11 months to rollingMonths", () => {
    const intent = parseAnalyticsAskIntent("Revenue last 11 months by source");
    expect(intent.rollingMonths).toBe(11);
  });

  it("maps last 45 days to rollingDays", () => {
    const intent = parseAnalyticsAskIntent("Visits last 45 days by channel");
    expect(intent.rollingDays).toBe(45);
    expect(intent.period).toBeUndefined();
  });

  it("keeps fixed last 6 months as preset period", () => {
    const intent = parseAnalyticsAskIntent("Retained customers last 6 months by customer type");
    expect(intent.period).toBe("last6months");
    expect(intent.rollingMonths).toBeUndefined();
  });

  it("parses by intent tier before generic conversion keyword", () => {
    const intent = parseAnalyticsAskIntent(
      "June 2026 visits and conversion breakdown by intent tier",
    );
    expect(intent.breakdownDimension).toBe("intentTier");
  });

  it("parses this month vs last year as compare mode", () => {
    const intent = parseAnalyticsAskIntent("Compare this month vs last year revenue by customer type");
    expect(intent.dateMode).toBe("compare");
    expect(intent.compareBYear).toBe(intent.compareAYear! - 1);
  });
});

describe("describeParsedIntent rolling windows", () => {
  it("describes rolling months in the interpreted label", () => {
    const intent = parseAnalyticsAskIntent(
      "Retained customers last 10 months by customer type",
    );
    const label = describeParsedIntent(intent);
    expect(label).toContain("Last 10 months");
    expect(label).not.toContain("Last 30 days");
    expect(label).toContain("retained");
    expect(label).toContain("customer type");
  });
});

describe("scoreRuleParseConfidence rolling months", () => {
  it("scores high confidence when rolling months match the prompt", () => {
    const prompt = "Retained customers last 10 months by customer type";
    const intent = parseAnalyticsAskIntent(prompt);
    expect(scoreRuleParseConfidence(prompt, intent)).toBe("high");
  });
});

describe("getPeriodRange last30days", () => {
  it("covers a rolling 30-day inclusive window", () => {
    const reference = new Date("2026-06-20T15:00:00.000Z");
    const { start, end } = getPeriodRange("last30days", reference);

    expect(end.getDate()).toBe(20);
    expect(start.getDate()).toBe(22);
    expect(start.getMonth()).toBe(4);
    expect(end.getMonth()).toBe(5);
  });
});

describe("getRollingMonthsRange", () => {
  it("starts on the 1st of the calendar month N months back", () => {
    const reference = new Date("2026-06-25T12:00:00.000Z");
    const { start, end } = getRollingMonthsRange(10, reference);
    expect(start.getMonth()).toBe(8);
    expect(start.getDate()).toBe(1);
    expect(end.getDate()).toBe(25);
  });
});

describe("formatPresetPeriodLabel", () => {
  it("labels month as this month with explicit dates", () => {
    const start = new Date("2026-06-01T00:00:00.000Z");
    const end = new Date("2026-06-20T23:59:59.999Z");
    const label = formatPresetPeriodLabel("month", start, end);
    expect(label.startsWith("This month (")).toBe(true);
    expect(label).not.toContain("Last 30 days");
  });
});

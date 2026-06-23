import { describe, expect, it } from "vitest";
import { parseAnalyticsAskIntent } from "@/lib/analytics/ask-intent-parser";
import { getPeriodRange } from "@/lib/utils/analytics";
import { formatPresetPeriodLabel } from "@/lib/utils/analytics-date-range";

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

describe("formatPresetPeriodLabel", () => {
  it("labels month as this month with explicit dates", () => {
    const start = new Date("2026-06-01T00:00:00.000Z");
    const end = new Date("2026-06-20T23:59:59.999Z");
    const label = formatPresetPeriodLabel("month", start, end);
    expect(label.startsWith("This month (")).toBe(true);
    expect(label).not.toContain("Last 30 days");
  });
});

import { describe, expect, it } from "vitest";
import { buildAskKpis } from "@/lib/analytics/ask-kpis";
import { parseAnalyticsAskIntent } from "@/lib/analytics/ask-intent-parser";
import { pickAskKpiMetrics, buildAskWidgetContext } from "@/lib/analytics/ask-widget-catalog";
import type { AnalyticsSummary } from "@/types/admin-business-analytics";

const baseSummary: AnalyticsSummary = {
  totalVisits: 120,
  totalRevenue: 450000,
  conversionRate: 32,
  uniqueCustomers: 80,
  avgTransaction: 12000,
  fieldSalesCount: 15,
};

describe("buildAskKpis", () => {
  it("returns compare deltas on KPI cards when provided", () => {
    const intent = parseAnalyticsAskIntent("Compare January 2026 vs January 2025 revenue");
    const cards = buildAskKpis(intent, baseSummary, {
      deltas: {
        totalVisits: 10,
        totalRevenue: -5,
        conversionRate: 2,
        uniqueCustomers: 8,
        avgTransaction: -1,
        fieldSalesCount: 0,
      },
    });
    expect(cards.some((c) => c.metric === "revenue" && c.delta === -5)).toBe(true);
    expect(cards.some((c) => c.metric === "visits" && c.delta === 10)).toBe(true);
  });

  it("prioritizes unique customers for retained segment questions", () => {
    const intent = parseAnalyticsAskIntent("Retained customers last 6 months by customer type");
    const cards = buildAskKpis(intent, baseSummary);
    expect(cards[0]?.metric).toBe("uniqueCustomers");
    expect(cards.map((c) => c.metric)).toContain("conversion");
  });

  it("emphasizes field sales for scheme questions", () => {
    const intent = parseAnalyticsAskIntent("Last 90 days scheme enrollment breakdown by enrollment outcome");
    const cards = buildAskKpis(intent, baseSummary);
    expect(cards[0]?.metric).toBe("fieldSales");
  });
});

describe("pickAskKpiMetrics", () => {
  it("returns fewer revenue-focused metrics for source breakdown", () => {
    const intent = parseAnalyticsAskIntent("Last 30 days visits by source channel");
    const ctx = buildAskWidgetContext(intent, "Last 30 days visits by source channel");
    const metrics = pickAskKpiMetrics(ctx);
    expect(metrics).toContain("visits");
    expect(metrics).toContain("revenue");
    expect(metrics.length).toBeLessThanOrEqual(6);
  });
});

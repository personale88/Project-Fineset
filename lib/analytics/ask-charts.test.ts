import { describe, expect, it } from "vitest";
import {
  chartTypeForScenario,
  pickChartTypesForScenario,
  resolveAskChartScenario,
} from "@/lib/analytics/ask-chart-scenarios";
import { parseAnalyticsAskIntent } from "@/lib/analytics/ask-intent-parser";
import { buildAskCharts, pickChartTypesFromData } from "@/lib/analytics/ask-charts";
import type { AdminBusinessAnalytics } from "@/types/admin-business-analytics";

function mockAnalytics(overrides?: Partial<AdminBusinessAnalytics>): AdminBusinessAnalytics {
  return {
    dateMode: "preset",
    period: { start: "2026-01-01", end: "2026-06-01", label: "Last 6 months" },
    summary: {
      totalVisits: 50,
      totalRevenue: 200000,
      conversionRate: 28,
      uniqueCustomers: 40,
      avgTransaction: 8000,
      fieldSalesCount: 5,
    },
    trends: [
      { date: "2026-05-01", visits: 2, revenue: 1000 },
      { date: "2026-05-02", visits: 3, revenue: 2000 },
    ],
    appliedFilters: [],
    breakdowns: {
      customerType: [
        { label: "New", count: 20 },
        { label: "Repeat", count: 30 },
      ],
      valueTier: [],
      intentTier: [],
      purchaseStatus: [
        { label: "Purchased", count: 14 },
        { label: "Not purchased", count: 36 },
      ],
      sourceChannel: [
        { label: "Walk-in", count: 25 },
        { label: "Referral", count: 10 },
      ],
      gender: [],
      ageGroup: [],
      area: [],
      visitType: [],
      budgetRange: [],
      productsExplored: [{ label: "Rings", count: 12 }],
      productsPurchased: [],
      schemeProduct: [],
      enrollmentOutcome: [],
      staff: [],
    },
    aiInsights: { available: false, summary: null, recommendations: [] },
    ...overrides,
  };
}

describe("resolveAskChartScenario", () => {
  it("classifies year-on-year compare as yoyCompare", () => {
    const intent = parseAnalyticsAskIntent("Compare January 2026 vs January 2025 revenue");
    expect(resolveAskChartScenario(intent, "Compare January 2026 vs January 2025 revenue", mockAnalytics())).toBe(
      "yoyCompare",
    );
    expect(chartTypeForScenario("yoyCompare")).toBe("groupedBar");
  });

  it("classifies same-year month compare as momCompare", () => {
    const intent = parseAnalyticsAskIntent("Compare January 2026 vs February 2026 visits");
    expect(resolveAskChartScenario(intent, "Compare January 2026 vs February 2026 visits", mockAnalytics())).toBe(
      "momCompare",
    );
    expect(chartTypeForScenario("momCompare")).toBe("comparison");
  });

  it("classifies revenue trend as salesOverTime", () => {
    const intent = parseAnalyticsAskIntent("Last 6 months revenue trend");
    expect(resolveAskChartScenario(intent, "Last 6 months revenue trend", mockAnalytics())).toBe(
      "salesOverTime",
    );
  });

  it("classifies customer type breakdown as customerTypeBreakdown", () => {
    const intent = parseAnalyticsAskIntent("Last 6 months visits by customer type");
    expect(resolveAskChartScenario(intent, "Last 6 months visits by customer type", mockAnalytics())).toBe(
      "customerTypeBreakdown",
    );
  });
});

describe("pickChartTypesFromData / buildAskCharts", () => {
  it("returns groupedBar only for YoY compare", () => {
    const prompt = "Compare January 2026 vs January 2025 revenue";
    const intent = parseAnalyticsAskIntent(prompt);
    const analytics = mockAnalytics({
      dateMode: "compare",
      comparison: {
        period: { start: "2025-01-01", end: "2025-01-31", label: "January 2025" },
        summary: mockAnalytics().summary,
        trends: [],
        comparisonTrends: [
          {
            day: 1,
            label: "1",
            periodA: { visits: 10, revenue: 1000 },
            periodB: { visits: 8, revenue: 800 },
          },
        ],
        deltas: {
          totalVisits: 5,
          totalRevenue: 10,
          conversionRate: 1,
          uniqueCustomers: 3,
          avgTransaction: 2,
          fieldSalesCount: 0,
        },
      },
    });
    const types = pickChartTypesFromData(analytics, intent, prompt);
    expect(types).toEqual(["groupedBar"]);
    const charts = buildAskCharts(intent, analytics, { prompt });
    expect(charts).toHaveLength(1);
    expect(charts[0]?.type).toBe("groupedBar");
  });

  it("returns comparison line only for MoM compare", () => {
    const prompt = "Compare January 2026 vs February 2026 revenue";
    const intent = parseAnalyticsAskIntent(prompt);
    const analytics = mockAnalytics({
      dateMode: "compare",
      comparison: {
        period: { start: "2026-02-01", end: "2026-02-28", label: "February 2026" },
        summary: mockAnalytics().summary,
        trends: [],
        comparisonTrends: [
          {
            day: 1,
            label: "1",
            periodA: { visits: 10, revenue: 1000 },
            periodB: { visits: 12, revenue: 1200 },
          },
        ],
        deltas: {
          totalVisits: 5,
          totalRevenue: 10,
          conversionRate: 1,
          uniqueCustomers: 3,
          avgTransaction: 2,
          fieldSalesCount: 0,
        },
      },
    });
    const types = pickChartTypesForScenario("momCompare", intent, analytics, prompt);
    expect(types).toEqual(["comparison"]);
  });

  it("returns single area chart for revenue trend", () => {
    const prompt = "Last 6 months revenue trend";
    const intent = parseAnalyticsAskIntent(prompt);
    const charts = buildAskCharts(intent, mockAnalytics(), { prompt });
    expect(charts).toHaveLength(1);
    expect(charts[0]?.type).toBe("area");
    expect(charts[0]?.description).toContain("Daily revenue");
  });

  it("returns single pie for customer type breakdown without extra radar", () => {
    const prompt = "Last 6 months visits by customer type";
    const intent = parseAnalyticsAskIntent(prompt);
    const charts = buildAskCharts(intent, mockAnalytics(), { prompt });
    expect(charts).toHaveLength(1);
    expect(charts[0]?.type).toBe("pie");
  });
});

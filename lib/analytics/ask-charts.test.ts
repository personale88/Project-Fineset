import { describe, expect, it } from "vitest";
import { pickChartTypesFromData, buildAskCharts } from "@/lib/analytics/ask-charts";
import { parseAnalyticsAskIntent } from "@/lib/analytics/ask-intent-parser";
import { buildAnalyticsAskExamples } from "@/lib/analytics/ask-example-prompts";
import type { AdminBusinessAnalytics } from "@/types/admin-business-analytics";

function mockAnalytics(overrides?: Partial<AdminBusinessAnalytics>): AdminBusinessAnalytics {
  return {
    dateMode: "preset",
    period: { start: "2026-01-01", end: "2026-06-01", label: "Last 30 days" },
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
      intentTier: [{ label: "Hot", count: 10 }, { label: "Warm", count: 15 }],
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
      productsExplored: [],
      productsPurchased: [],
      schemeProduct: [],
      enrollmentOutcome: [],
      staff: [],
    },
    aiInsights: {
      available: false,
      summary: null,
      recommendations: [],
    },
    ...overrides,
  };
}

const exampleTemplates = [
  { id: "compare", template: "Compare {currentPeriod} vs {priorYearPeriod} revenue" },
  { id: "trend", template: "Last 30 days revenue trend by visit source" },
  { id: "retained", template: "Retained customers last 6 months by customer type" },
  { id: "conversion", template: "{currentPeriod} conversion and purchase status breakdown" },
] as const;

describe("pickChartTypesFromData", () => {
  it("includes comparison chart when analytics has comparison data", () => {
    const intent = parseAnalyticsAskIntent("Compare January 2026 vs January 2025 revenue");
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
            periodA: { visits: 1, revenue: 100 },
            periodB: { visits: 2, revenue: 200 },
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
    const types = pickChartTypesFromData(analytics, intent);
    expect(types).toContain("comparison");
  });

  it("prefers pie for conversion breakdown intent", () => {
    const intent = parseAnalyticsAskIntent("Last 30 days conversion breakdown");
    const types = pickChartTypesFromData(mockAnalytics(), intent);
    expect(types).toContain("pie");
  });
});

describe("buildAskCharts example prompts", () => {
  const examples = buildAnalyticsAskExamples([...exampleTemplates]);

  it("builds at least one chart for each sample business prompt", () => {
    for (const example of examples) {
      const intent = parseAnalyticsAskIntent(example.prompt);
      const charts = buildAskCharts(intent, mockAnalytics(), { prompt: example.prompt });
      expect(charts.length, example.id).toBeGreaterThan(0);
    }
  });

  it("uses intent tier breakdown for intent tier example", () => {
    const prompt = "June 2026 visits and conversion breakdown by intent tier";
    const intent = parseAnalyticsAskIntent(prompt);
    expect(intent.breakdownDimension).toBe("intentTier");
  });
});

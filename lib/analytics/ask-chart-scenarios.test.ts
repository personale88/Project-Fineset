import { describe, expect, it } from "vitest";
import {
  chartTypeForScenario,
  pickChartTypesForScenario,
  resolveAskChartMetric,
  resolveAskChartScenario,
} from "@/lib/analytics/ask-chart-scenarios";
import { buildAskCharts } from "@/lib/analytics/ask-charts";
import { parseAnalyticsAskIntent } from "@/lib/analytics/ask-intent-parser";
import type { AdminBusinessAnalytics } from "@/types/admin-business-analytics";

function mockAnalytics(overrides?: Partial<AdminBusinessAnalytics>): AdminBusinessAnalytics {
  return {
    dateMode: "preset",
    period: { start: "2026-01-01", end: "2026-06-29", label: "Last 6 months" },
    summary: {
      totalVisits: 20972,
      totalRevenue: 676291635,
      conversionRate: 47.7,
      uniqueCustomers: 20972,
      avgTransaction: 67562,
      fieldSalesCount: 0,
    },
    trends: Array.from({ length: 10 }, (_, i) => ({
      date: `2026-0${1 + Math.floor(i / 5)}-${String((i % 28) + 1).padStart(2, "0")}`,
      visits: 100 + i,
      revenue: 50000 + i * 1000,
    })),
    appliedFilters: [],
    breakdowns: {
      customerType: [
        { label: "New", count: 6991 },
        { label: "Repeat", count: 6991 },
        { label: "VIP", count: 6990 },
      ],
      valueTier: [
        { label: "High value", count: 30 },
        { label: "Mid value", count: 15 },
        { label: "Low value", count: 5 },
      ],
      intentTier: [],
      purchaseStatus: [
        { label: "Purchased", count: 10000 },
        { label: "Not purchased", count: 10972 },
      ],
      sourceChannel: [
        { label: "Walk-in", count: 15000 },
        { label: "Referral", count: 5972 },
      ],
      gender: [],
      ageGroup: [],
      area: [],
      visitType: [],
      budgetRange: [],
      productsExplored: [
        { label: "Rings", count: 5000 },
        { label: "Necklaces", count: 3000 },
        { label: "Bangles", count: 2000 },
      ],
      productsPurchased: [],
      schemeProduct: [],
      enrollmentOutcome: [],
      staff: [],
    },
    aiInsights: { available: false, summary: null, recommendations: [] },
    ...overrides,
  };
}

function compareAnalytics(
  periodBLabel: string,
  periodBStart: string,
  periodBEnd: string,
): Partial<AdminBusinessAnalytics> {
  return {
    dateMode: "compare",
    comparison: {
      period: { start: periodBStart, end: periodBEnd, label: periodBLabel },
      summary: mockAnalytics().summary,
      trends: [],
      comparisonTrends: [
        {
          day: 1,
          label: "1",
          periodA: { visits: 100, revenue: 10000 },
          periodB: { visits: 80, revenue: 8000 },
        },
        {
          day: 15,
          label: "15",
          periodA: { visits: 120, revenue: 12000 },
          periodB: { visits: 90, revenue: 9000 },
        },
      ],
      deltas: {
        totalVisits: 10,
        totalRevenue: 15,
        conversionRate: 2,
        uniqueCustomers: 8,
        avgTransaction: 5,
        fieldSalesCount: 0,
      },
    },
  };
}

/** Staging QA matrix — chart type per question (no live DB required). */
const QA_CHART_MATRIX = [
  {
    id: "CHART-01",
    prompt: "Compare January 2026 vs January 2025 visits",
    expectedScenario: "yoyCompare",
    expectedChart: "groupedBar",
  },
  {
    id: "CHART-02",
    prompt: "Compare January 2026 vs February 2026 revenue",
    expectedScenario: "momCompare",
    expectedChart: "comparison",
  },
  {
    id: "CHART-03",
    prompt: "Last 6 months revenue trend",
    expectedScenario: "salesOverTime",
    expectedChart: "area",
  },
  {
    id: "CHART-04",
    prompt: "Revenue by source channel",
    expectedScenario: "revenueDistribution",
    expectedChart: "pie",
  },
  {
    id: "CHART-05",
    prompt: "Top products explored last 6 months",
    expectedScenario: "topProductsRanked",
    expectedChart: "rankedBar",
  },
  {
    id: "CHART-06",
    prompt: "Customer value tier profile",
    expectedScenario: "customerSegments",
    expectedChart: "radar",
  },
  {
    id: "CHART-07",
    prompt: "Visits by customer type over time",
    expectedScenario: "periodTypeSplit",
    expectedChart: "stackedBar",
  },
  {
    id: "CHART-08",
    prompt: "Last 6 months visits by customer type",
    expectedScenario: "customerTypeBreakdown",
    expectedChart: "pie",
  },
  {
    id: "CHART-09",
    prompt: "Revenue forecast next quarter",
    expectedScenario: "growthForecast",
    expectedChart: "area",
  },
  {
    id: "CHART-10",
    prompt: "How are we doing last 6 months?",
    expectedScenario: "summaryKpis",
    expectedChart: null,
  },
] as const;

describe("QA chart matrix (staging checklist)", () => {
  for (const row of QA_CHART_MATRIX) {
    it(`${row.id}: ${row.prompt}`, () => {
      const intent = parseAnalyticsAskIntent(row.prompt);
      const analytics = mockAnalytics(
        row.expectedScenario === "yoyCompare"
          ? compareAnalytics("January 2025", "2025-01-01", "2025-01-31")
          : row.expectedScenario === "momCompare"
            ? compareAnalytics("February 2026", "2026-02-01", "2026-02-28")
            : {},
      );

      const scenario = resolveAskChartScenario(intent, row.prompt, analytics);
      expect(scenario, `${row.id} scenario`).toBe(row.expectedScenario);

      const types = pickChartTypesForScenario(scenario, intent, analytics, row.prompt);
      if (row.expectedChart === null) {
        expect(types).toEqual([]);
      } else {
        expect(types[0], `${row.id} chart type`).toBe(row.expectedChart);
        expect(types.length, `${row.id} chart count`).toBeLessThanOrEqual(2);
      }

      const charts = buildAskCharts(intent, analytics, { prompt: row.prompt });
      if (row.expectedChart === null) {
        expect(charts).toHaveLength(0);
      } else {
        expect(charts.length).toBeGreaterThanOrEqual(1);
        expect(charts[0]?.type).toBe(row.expectedChart);
      }
    });
  }
});

describe("resolveAskChartMetric", () => {
  it("uses revenue when prompt mentions revenue without visits", () => {
    expect(resolveAskChartMetric("Last 6 months revenue trend")).toBe("revenue");
  });

  it("uses visits when prompt mentions visits", () => {
    expect(resolveAskChartMetric("Compare January 2026 vs January 2025 visits")).toBe(
      "visits",
    );
  });
});

describe("empty / sparse data safety", () => {
  it("returns no charts when summary has zero visits and no breakdown", () => {
    const prompt = "Last 6 months visits by customer type";
    const intent = parseAnalyticsAskIntent(prompt);
    const empty = mockAnalytics({
      summary: {
        totalVisits: 0,
        totalRevenue: 0,
        conversionRate: 0,
        uniqueCustomers: 0,
        avgTransaction: 0,
        fieldSalesCount: 0,
      },
      trends: [],
      breakdowns: {
        ...mockAnalytics().breakdowns,
        customerType: [],
      },
    });
    const charts = buildAskCharts(intent, empty, { prompt });
    expect(charts).toHaveLength(0);
  });

  it("returns no charts for compare when comparison trends are missing", () => {
    const prompt = "Compare January 2026 vs January 2025 visits";
    const intent = parseAnalyticsAskIntent(prompt);
    const analytics = mockAnalytics({
      ...compareAnalytics("January 2025", "2025-01-01", "2025-01-31"),
      comparison: {
        ...compareAnalytics("January 2025", "2025-01-01", "2025-01-31").comparison!,
        comparisonTrends: [],
      },
    });
    const charts = buildAskCharts(intent, analytics, { prompt });
    expect(charts).toHaveLength(0);
  });

  it("caps pie slices at 7 including Other bucket", () => {
    const prompt = "Revenue by source channel";
    const intent = parseAnalyticsAskIntent(prompt);
    const manyChannels = mockAnalytics({
      breakdowns: {
        ...mockAnalytics().breakdowns,
        sourceChannel: Array.from({ length: 10 }, (_, i) => ({
          label: `Channel ${i + 1}`,
          count: 100 - i,
        })),
      },
    });
    const charts = buildAskCharts(intent, manyChannels, { prompt });
    expect(charts[0]?.type).toBe("pie");
    expect(charts[0]?.breakdown?.length).toBeLessThanOrEqual(7);
  });
});

describe("chartTypeForScenario", () => {
  it("maps every scenario to a chart type or null", () => {
    const scenarios = [
      "yoyCompare",
      "momCompare",
      "salesOverTime",
      "revenueDistribution",
      "topProductsRanked",
      "customerSegments",
      "periodTypeSplit",
      "customerTypeBreakdown",
      "growthForecast",
      "summaryKpis",
      "auto",
    ] as const;
    for (const scenario of scenarios) {
      expect(() => chartTypeForScenario(scenario)).not.toThrow();
    }
  });
});

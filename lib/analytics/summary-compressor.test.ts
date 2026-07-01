import { describe, expect, it } from "vitest";
import { compressSummary } from "@/lib/analytics/summary-compressor";
import type { AdminBusinessAnalytics } from "@/types/admin-business-analytics";

function mockAnalytics(): AdminBusinessAnalytics {
  return {
    dateMode: "preset",
    period: { start: "2026-06-25", end: "2026-07-01", label: "Last 7 days" },
    summary: {
      totalVisits: 100,
      totalRevenue: 500000,
      conversionRate: 40,
      uniqueCustomers: 80,
      avgTransaction: 5000,
      fieldSalesCount: 0,
    },
    trends: [
      { date: "2026-06-25", visits: 20, revenue: 100000 },
      { date: "2026-06-26", visits: 30, revenue: 150000 },
    ],
    appliedFilters: [],
    breakdowns: {
      customerType: [{ label: "New", count: 60, revenue: 300000 }],
      valueTier: [],
      intentTier: [],
      purchaseStatus: [],
      sourceChannel: [],
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
    aiInsights: { available: false, summary: null, recommendations: [] },
  };
}

describe("compressSummary", () => {
  it("omits dailyTrend by default", () => {
    const compressed = compressSummary(mockAnalytics());
    expect(compressed.dailyTrend).toBeUndefined();
  });

  it("includes compact dailyTrend when requested", () => {
    const compressed = compressSummary(mockAnalytics(), { includeDailyTrend: true });
    expect(compressed.dailyTrend).toEqual([
      { date: "2026-06-25", visits: 20, revenue: 100000 },
      { date: "2026-06-26", visits: 30, revenue: 150000 },
    ]);
  });
});

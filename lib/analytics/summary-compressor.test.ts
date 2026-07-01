import { describe, expect, it } from "vitest";
import { compressSummary } from "@/lib/analytics/summary-compressor";
import type { AdminBusinessAnalytics } from "@/types/admin-business-analytics";

function mockAnalytics(): AdminBusinessAnalytics {
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
      customerType: [{ label: "New", count: 20 }],
      valueTier: [
        { label: "High", count: 10 },
        { label: "Low", count: 5 },
      ],
      intentTier: [],
      purchaseStatus: [],
      sourceChannel: [],
      gender: [],
      ageGroup: [],
      area: [],
      visitType: [],
      budgetRange: [],
      productsExplored: [{ label: "NOSE_PIN", count: 8 }],
      productsPurchased: [],
      schemeProduct: [],
      enrollmentOutcome: [],
      staff: [],
    },
    aiInsights: { available: false, summary: null, recommendations: [] },
  };
}

describe("compressSummary", () => {
  it("includes topProducts when requested", () => {
    const compressed = compressSummary(mockAnalytics(), { includeProducts: true });
    expect(compressed.topProducts).toEqual([{ label: "NOSE_PIN", count: 8 }]);
  });

  it("includes valueTier when requested", () => {
    const compressed = compressSummary(mockAnalytics(), { includeValueTier: true });
    expect(compressed.valueTier).toEqual([
      { label: "High", count: 10 },
      { label: "Low", count: 5 },
    ]);
  });

  it("omits optional breakdowns by default", () => {
    const compressed = compressSummary(mockAnalytics());
    expect(compressed.topProducts).toBeUndefined();
    expect(compressed.valueTier).toBeUndefined();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminBusinessAnalyticsQuery } from "@/lib/validations/admin-business-analytics.schema";

const mockQueryAggregateRows = vi.fn();
const mockFetchArrayFieldRows = vi.fn();
const mockVisitCount = vi.fn();
const mockVisitFindMany = vi.fn();
const mockFieldSaleCount = vi.fn();
const mockRefreshVisitAggregate = vi.fn();

vi.mock("@/lib/analytics/aggregate-queries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/analytics/aggregate-queries")>();
  return {
    ...actual,
    queryAggregateRows: (...args: unknown[]) => mockQueryAggregateRows(...args),
    fetchArrayFieldRows: (...args: unknown[]) => mockFetchArrayFieldRows(...args),
  };
});

vi.mock("@/lib/analytics/refresh-visit-aggregate", () => ({
  refreshVisitAggregate: (...args: unknown[]) => mockRefreshVisitAggregate(...args),
  notifyVisitsChanged: vi.fn(),
  scheduleVisitAggregateRefresh: vi.fn(),
}));

vi.mock("@/lib/cache/analytics-cache", () => ({
  getCachedSummary: vi.fn().mockResolvedValue(null),
  setCachedSummary: vi.fn().mockResolvedValue(undefined),
  getCachedFilterOptions: vi.fn().mockResolvedValue(null),
  setCachedFilterOptions: vi.fn().mockResolvedValue(undefined),
  buildVersionedQueryKey: vi.fn().mockResolvedValue("test-cache-key"),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    store: {
      findMany: vi.fn().mockResolvedValue([{ id: "store-1", name: "Vignesh FineSet Store" }]),
    },
    staff: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    visit: {
      count: (...args: unknown[]) => mockVisitCount(...args),
      findMany: (...args: unknown[]) => mockVisitFindMany(...args),
    },
    fieldSale: {
      count: (...args: unknown[]) => mockFieldSaleCount(...args),
    },
  },
}));

function mockVisitRow(overrides?: Partial<{ visitDate: Date; customerType: string }>) {
  return {
    id: "visit-1",
    visitDate: overrides?.visitDate ?? new Date("2026-03-15T10:00:00Z"),
    storeId: "store-1",
    staffId: "staff-1",
    customerType: overrides?.customerType ?? "REPEAT",
    purchaseStatus: "PURCHASED",
    transactionAmount: 50000,
    budgetStated: null,
    intentTier: null,
    sourceChannel: "WALK_IN",
    gender: null,
    ageGroup: null,
    area: null,
    visitType: "WALK_IN",
    productsExplored: [],
    productsPurchased: ["RINGS"],
    schemesPitched: [],
    enrollmentOutcome: null,
    schemeEnrolled: false,
    customerPhoneHash: "hash-1",
    staff: { name: "Staff A" },
  };
}

describe("getAdminBusinessAnalytics aggregate stale fallback", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockQueryAggregateRows.mockResolvedValue([]);
    mockFetchArrayFieldRows.mockResolvedValue([]);
    mockFieldSaleCount.mockResolvedValue(0);
    mockVisitCount.mockResolvedValue(0);
    mockVisitFindMany.mockResolvedValue([]);
    mockRefreshVisitAggregate.mockResolvedValue(undefined);
  });

  async function loadAnalytics() {
    return import("@/lib/services/admin-business-analytics");
  }

  it("returns zero visits when aggregate and live visits are both empty", async () => {
    const { getAdminBusinessAnalytics } = await loadAnalytics();
    const query: AdminBusinessAnalyticsQuery = {
      dateMode: "preset",
      period: "last6months",
      activeFilters: [],
      segment: "ALL",
      valueTier: "ALL",
    };

    const result = await getAdminBusinessAnalytics(query);

    expect(result.summary.totalVisits).toBe(0);
    expect(mockRefreshVisitAggregate).not.toHaveBeenCalled();
  });

  it("falls back to raw Visit rows when aggregate is empty but live visits exist", async () => {
    mockVisitCount.mockResolvedValue(2);
    mockVisitFindMany.mockResolvedValue([mockVisitRow(), mockVisitRow({ customerType: "NEW" })]);

    const { getAdminBusinessAnalytics } = await loadAnalytics();
    const query: AdminBusinessAnalyticsQuery = {
      dateMode: "preset",
      period: "last6months",
      activeFilters: ["storeId"],
      storeId: "store-1",
      segment: "ALL",
      valueTier: "ALL",
    };

    const result = await getAdminBusinessAnalytics(query);

    expect(result.summary.totalVisits).toBe(2);
    expect(mockQueryAggregateRows).toHaveBeenCalled();
    expect(mockVisitCount).toHaveBeenCalled();
    expect(mockVisitFindMany).toHaveBeenCalled();
    expect(mockRefreshVisitAggregate).toHaveBeenCalledTimes(1);
  });

  it("uses aggregate path when aggregate rows have visits (no fallback)", async () => {
    mockQueryAggregateRows.mockResolvedValue([
      {
        store_id: "store-1",
        staff_id: "staff-1",
        date: new Date("2026-03-01"),
        customer_type: "REPEAT",
        source_channel: "WALK_IN",
        intent_tier: null,
        purchase_status: "PURCHASED",
        budget_stated: null,
        total_visits: BigInt(100),
        purchased_count: BigInt(50),
        total_revenue: 500000,
        unique_customers: BigInt(80),
        avg_transaction: 10000,
      },
    ]);

    const { getAdminBusinessAnalytics } = await loadAnalytics();
    const query: AdminBusinessAnalyticsQuery = {
      dateMode: "preset",
      period: "last6months",
      activeFilters: [],
      segment: "ALL",
      valueTier: "ALL",
    };

    const result = await getAdminBusinessAnalytics(query);

    expect(result.summary.totalVisits).toBe(100);
    expect(mockVisitCount).not.toHaveBeenCalled();
    expect(mockRefreshVisitAggregate).not.toHaveBeenCalled();
  });
});

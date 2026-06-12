import { describe, expect, it } from "vitest";
import {
  normalizeStoreManagerPortfolio,
  normalizeStorePerformanceRow,
  portfolioHasStoreManagerFields,
  storePerformanceRowHasManagerFields,
} from "@/lib/utils/normalize-store-performance";
import type { StoreManagerPortfolio, StorePerformanceRow } from "@/types";

function makeRow(overrides: Partial<StorePerformanceRow> = {}): StorePerformanceRow {
  return {
    storeId: "store-1",
    storeName: "Alpha",
    category: "JEWELRY",
    city: "Mumbai",
    state: "MH",
    isActive: true,
    storeManagerName: null,
    storeManagerPhone: null,
    staffCount: 2,
    visits: 10,
    revenue: 1000,
    conversionRate: 50,
    avgTicketSize: 0,
    schemesEnrolled: 0,
    fieldSales: 0,
    userCalls: 0,
    ...overrides,
  };
}

describe("storePerformanceRowHasManagerFields", () => {
  it("detects stale rows missing manager fields", () => {
    const stale = makeRow();
    delete (stale as Partial<StorePerformanceRow>).storeManagerName;
    delete (stale as Partial<StorePerformanceRow>).storeManagerPhone;
    expect(storePerformanceRowHasManagerFields(stale)).toBe(false);
  });

  it("accepts rows with manager fields even when null", () => {
    expect(storePerformanceRowHasManagerFields(makeRow())).toBe(true);
  });
});

describe("portfolioHasStoreManagerFields", () => {
  it("requires every store row to include manager fields", () => {
    const stale = makeRow({ storeId: "a" });
    delete (stale as Partial<StorePerformanceRow>).storeManagerName;
    expect(
      portfolioHasStoreManagerFields({
        period: "week",
        stores: [makeRow({ storeId: "b" }), stale],
      }),
    ).toBe(false);
  });
});

describe("normalizeStorePerformanceRow", () => {
  it("fills missing metric fields", () => {
    const row = normalizeStorePerformanceRow(
      makeRow({
        fieldSales: undefined,
        userCalls: undefined,
      }),
    );
    expect(row.fieldSales).toBe(0);
    expect(row.userCalls).toBe(0);
  });
});

describe("normalizeStoreManagerPortfolio", () => {
  it("is idempotent", () => {
    const portfolio: StoreManagerPortfolio = {
      period: "week",
      stores: [makeRow({ storeId: "b" }), makeRow({ storeId: "a" })],
    };
    const once = normalizeStoreManagerPortfolio(portfolio);
    const twice = normalizeStoreManagerPortfolio(once);
    expect(twice).toEqual(once);
  });

  it("normalizes 100 stores under 50ms", () => {
    const portfolio: StoreManagerPortfolio = {
      period: "week",
      stores: Array.from({ length: 100 }, (_, index) =>
        makeRow({ storeId: `store-${index}` }),
      ),
    };
    const start = performance.now();
    normalizeStoreManagerPortfolio(portfolio);
    expect(performance.now() - start).toBeLessThan(50);
  });
});

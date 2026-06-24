import { describe, expect, it } from "vitest";
import {
  DEFAULT_STORE_PORTFOLIO_SORT,
  sortStorePerformanceRows,
} from "./store-portfolio-sort";
import type { StorePerformanceRow } from "@/types";

function makeRow(
  overrides: Partial<StorePerformanceRow> & Pick<StorePerformanceRow, "storeId" | "storeName">,
): StorePerformanceRow {
  return {
    category: "JEWELRY",
    city: "Hyderabad",
    state: "Telangana",
    isActive: true,
    storeManagerName: null,
    storeManagerPhone: null,
    visits: 0,
    revenue: 0,
    conversionRate: 0,
    avgTicketSize: 0,
    schemesEnrolled: 0,
    staffCount: 0,
    fieldSales: 0,
    userCalls: 0,
    ...overrides,
  };
}

describe("sortStorePerformanceRows", () => {
  const rows = [
    makeRow({
      storeId: "a",
      storeName: "Alpha Store",
      revenue: 1000,
      visits: 5,
      city: "Chennai",
    }),
    makeRow({
      storeId: "b",
      storeName: "Beta Store",
      revenue: 5000,
      visits: 2,
      city: "Hyderabad",
      isActive: false,
      deltas: { revenue: 50, visits: 10 },
    }),
    makeRow({
      storeId: "c",
      storeName: "Gamma Store",
      revenue: 2000,
      visits: 8,
      city: "Bangalore",
      deltas: { revenue: 100, visits: -5 },
    }),
  ];

  it("defaults to name ascending", () => {
    const sorted = sortStorePerformanceRows(rows, DEFAULT_STORE_PORTFOLIO_SORT);
    expect(sorted.map((row) => row.storeId)).toEqual(["a", "b", "c"]);
  });

  it("sorts by revenue descending", () => {
    const sorted = sortStorePerformanceRows(rows, "revenueDesc");
    expect(sorted.map((row) => row.storeId)).toEqual(["b", "c", "a"]);
  });

  it("sorts active stores first", () => {
    const sorted = sortStorePerformanceRows(rows, "activeFirst");
    expect(sorted[0]?.storeId).toBe("a");
    expect(sorted.at(-1)?.storeId).toBe("b");
  });

  it("sorts by revenue delta descending", () => {
    const sorted = sortStorePerformanceRows(rows, "revenueDeltaDesc");
    expect(sorted.map((row) => row.storeId)).toEqual(["c", "b", "a"]);
  });
});

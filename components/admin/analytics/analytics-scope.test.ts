import { describe, expect, it } from "vitest";
import {
  ANALYTICS_ALL_STORES,
  buildAnalyticsScopeSummary,
  isAnalyticsScopeReady,
  resolveAnalyticsStoreId,
  toAnalyticsScopePayload,
  type AnalyticsScopeFilterValues,
} from "@/components/admin/analytics/AnalyticsScopeFilters";
import type { StoreCategory } from "@/types";

const stores = [
  { id: "store-a", name: "Alpha Store", city: "Mumbai", category: "JEWELRY" as StoreCategory },
  { id: "store-b", name: "Beta Store", city: "Delhi", category: "HANDBAGS" as StoreCategory },
];

const categories = {
  JEWELRY: "Jewelry",
  HANDBAGS: "Handbags",
  WATCHES: "Watches",
  OTHER: "Other",
} as Record<StoreCategory, string>;

describe("isAnalyticsScopeReady", () => {
  it("returns false when unselected", () => {
    expect(isAnalyticsScopeReady("")).toBe(false);
    expect(isAnalyticsScopeReady("pending")).toBe(false);
  });

  it("returns true for all stores or a store id", () => {
    expect(isAnalyticsScopeReady(ANALYTICS_ALL_STORES)).toBe(true);
    expect(isAnalyticsScopeReady("store-a")).toBe(true);
  });
});

describe("toAnalyticsScopePayload", () => {
  it("returns empty payload when unselected", () => {
    expect(toAnalyticsScopePayload({ city: "all", category: "all", storeId: "" })).toEqual({
      storeId: undefined,
      city: undefined,
      storeCategory: undefined,
    });
  });

  it("maps all stores with city and category filters", () => {
    expect(
      toAnalyticsScopePayload({
        city: "Mumbai",
        category: "JEWELRY",
        storeId: ANALYTICS_ALL_STORES,
      }),
    ).toEqual({
      storeId: undefined,
      city: "Mumbai",
      storeCategory: "JEWELRY",
    });
  });

  it("maps all stores without optional filters", () => {
    expect(
      toAnalyticsScopePayload({
        city: "all",
        category: "all",
        storeId: ANALYTICS_ALL_STORES,
      }),
    ).toEqual({
      storeId: undefined,
      city: undefined,
      storeCategory: undefined,
    });
  });

  it("maps a single store and clears city/category", () => {
    expect(
      toAnalyticsScopePayload({
        city: "Mumbai",
        category: "JEWELRY",
        storeId: "store-a",
      }),
    ).toEqual({
      storeId: "store-a",
      city: undefined,
      storeCategory: undefined,
    });
  });
});

describe("buildAnalyticsScopeSummary", () => {
  it("returns select label when unselected", () => {
    expect(
      buildAnalyticsScopeSummary(
        { city: "all", category: "all", storeId: "" },
        stores,
        categories,
        "Select a store",
        "All stores",
      ),
    ).toBe("Select a store");
  });

  it("summarizes all stores with filters", () => {
    expect(
      buildAnalyticsScopeSummary(
        { city: "Mumbai", category: "JEWELRY", storeId: ANALYTICS_ALL_STORES },
        stores,
        categories,
        "Select a store",
        "All stores",
      ),
    ).toBe("All stores · Mumbai · Jewelry");
  });

  it("summarizes a single store", () => {
    expect(
      buildAnalyticsScopeSummary(
        { city: "all", category: "all", storeId: "store-a" },
        stores,
        categories,
        "Select a store",
        "All stores",
      ),
    ).toBe("Alpha Store");
  });
});

describe("resolveAnalyticsStoreId", () => {
  it("keeps all stores selection", () => {
    expect(
      resolveAnalyticsStoreId(
        { city: "Mumbai", category: "all", storeId: ANALYTICS_ALL_STORES },
        stores,
      ),
    ).toBe(ANALYTICS_ALL_STORES);
  });

  it("clears store when it no longer matches city filter", () => {
    const values: AnalyticsScopeFilterValues = {
      city: "Delhi",
      category: "all",
      storeId: "store-a",
    };
    expect(resolveAnalyticsStoreId(values, stores)).toBe("");
  });
});

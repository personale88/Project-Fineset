import { describe, expect, it } from "vitest";
import {
  calculateStoreExpansionMrrUpside,
  computeAdminPortfolioExpansionKpis,
  isNearTierUpgradeStaffCount,
} from "./admin-portfolio-expansion-kpis";
import type { BusinessPortfolioRow } from "@/types";

describe("isNearTierUpgradeStaffCount", () => {
  it("flags staff near tier boundaries", () => {
    expect(isNearTierUpgradeStaffCount(9)).toBe(true);
    expect(isNearTierUpgradeStaffCount(19)).toBe(true);
    expect(isNearTierUpgradeStaffCount(5)).toBe(false);
  });
});

describe("calculateStoreExpansionMrrUpside", () => {
  it("returns positive upside for tier 1 stores near limit", () => {
    expect(calculateStoreExpansionMrrUpside(10)).toBeGreaterThan(0);
  });
});

describe("computeAdminPortfolioExpansionKpis", () => {
  it("counts single-store businesses and near-tier stores", () => {
    const business: BusinessPortfolioRow = {
      businessKey: "a@test.com",
      businessName: "A",
      ownerName: null,
      businessEmail: "a@test.com",
      businessPhone: null,
      hasBusinessEmail: true,
      storeCount: 1,
      activeStoreCount: 1,
      inactiveStoreCount: 0,
      dataExpiryAt: null,
      renewalDueAt: null,
      billingAnchorAt: null,
      ownerLastLoginAt: null,
      stores: [
        {
          storeId: "1",
          storeName: "Store",
          category: "JEWELRY",
          city: "Mumbai",
          state: "MH",
          isActive: true,
          storeManagerName: null,
          storeManagerPhone: null,
          staffCount: 10,
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-06-01T00:00:00.000Z",
          deletedAt: null,
          purgeAt: null,
          dataExpiryAt: null,
          renewalDueAt: null,
        },
      ],
    };

    const kpis = computeAdminPortfolioExpansionKpis([business]);
    expect(kpis.singleStoreBusinesses).toBe(1);
    expect(kpis.nearTierUpgradeStores).toBe(1);
    expect(kpis.expansionMrrUpside).toBeGreaterThan(0);
  });
});

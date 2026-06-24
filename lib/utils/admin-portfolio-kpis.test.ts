import { describe, expect, it } from "vitest";
import { computeAdminPortfolioKpis } from "./admin-portfolio-kpis";
import type { BusinessPortfolioRow } from "@/types";

function business(
  overrides: Partial<BusinessPortfolioRow> & Pick<BusinessPortfolioRow, "businessKey">,
): BusinessPortfolioRow {
  return {
    businessName: "Test Business",
    ownerName: "Owner",
    businessEmail: "owner@test.com",
    businessPhone: "9876543210",
    hasBusinessEmail: true,
    storeCount: 1,
    activeStoreCount: 1,
    inactiveStoreCount: 0,
    dataExpiryAt: null,
    renewalDueAt: "2026-12-01T00:00:00.000Z",
    billingAnchorAt: null,
    ownerLastLoginAt: "2026-06-01T00:00:00.000Z",
    stores: [
      {
        storeId: "s1",
        storeName: "Store One",
        category: "JEWELRY",
        city: "Mumbai",
        state: "MH",
        isActive: true,
        storeManagerName: "Manager",
        storeManagerPhone: "9876543210",
        staffCount: 5,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-06-01T00:00:00.000Z",
        deletedAt: null,
        purgeAt: null,
        dataExpiryAt: null,
        renewalDueAt: "2026-12-01T00:00:00.000Z",
      },
    ],
    ...overrides,
  };
}

describe("computeAdminPortfolioKpis", () => {
  it("computes MRR from store staff tiers", () => {
    const kpis = computeAdminPortfolioKpis([
      business({ businessKey: "a@test.com" }),
    ]);

    expect(kpis.mrr).toBe(5899);
    expect(kpis.totalBusinesses).toBe(1);
    expect(kpis.totalStaff).toBe(5);
  });

  it("counts missing contact and stale login", () => {
    const kpis = computeAdminPortfolioKpis([
      business({
        businessKey: "missing@test.com",
        businessEmail: null,
        businessPhone: null,
        hasBusinessEmail: false,
        ownerLastLoginAt: null,
      }),
    ]);

    expect(kpis.missingContactCount).toBe(1);
    expect(kpis.staleOwnerLoginCount).toBe(0);
  });
});

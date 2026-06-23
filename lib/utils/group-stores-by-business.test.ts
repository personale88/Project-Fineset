import { describe, expect, it } from "vitest";
import {
  businessGroupKey,
  groupStoresByBusiness,
  normalizeBusinessEmail,
} from "./group-stores-by-business";
import type { AdminStorePortfolioRow } from "@/types";

function row(
  overrides: Partial<AdminStorePortfolioRow> & Pick<AdminStorePortfolioRow, "storeId" | "storeName">,
): AdminStorePortfolioRow {
  return {
    category: "JEWELRY",
    city: "Mumbai",
    state: "MH",
    isActive: true,
    storeManagerName: null,
    storeManagerPhone: null,
    staffCount: 2,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-06-01T00:00:00.000Z",
    deletedAt: null,
    purgeAt: null,
    dataExpiryAt: null,
    renewalDueAt: null,
    businessOwnerEmail: null,
    businessOwnerName: null,
    ...overrides,
  };
}

describe("normalizeBusinessEmail", () => {
  it("lowercases and trims", () => {
    expect(normalizeBusinessEmail("  Owner@Example.COM ")).toBe("owner@example.com");
  });

  it("returns null for empty values", () => {
    expect(normalizeBusinessEmail("")).toBeNull();
    expect(normalizeBusinessEmail(undefined)).toBeNull();
  });
});

describe("businessGroupKey", () => {
  it("groups by normalized email", () => {
    expect(
      businessGroupKey(row({ storeId: "a", storeName: "A", businessOwnerEmail: "X@Y.com" })),
    ).toBe("x@y.com");
  });

  it("isolates stores without business email", () => {
    expect(businessGroupKey(row({ storeId: "solo", storeName: "Solo" }))).toBe("store:solo");
  });
});

describe("groupStoresByBusiness", () => {
  it("nests stores with the same business email", () => {
    const businesses = groupStoresByBusiness([
      row({
        storeId: "1",
        storeName: "Acme Jewels Bandra",
        businessOwnerEmail: "owner@test.com",
        businessOwnerName: "Jane Owner",
      }),
      row({
        storeId: "2",
        storeName: "Acme Jewels Andheri",
        businessOwnerEmail: "Owner@Test.com",
        businessOwnerName: "Jane Owner",
      }),
      row({ storeId: "3", storeName: "Gamma" }),
    ]);

    expect(businesses).toHaveLength(2);
    expect(businesses[0]?.businessEmail).toBe("owner@test.com");
    expect(businesses[0]?.storeCount).toBe(2);
    expect(businesses[0]?.businessName).toBe("Acme Jewels");
    expect(businesses[0]?.ownerName).toBe("Jane Owner");
    expect(businesses[1]?.storeCount).toBe(1);
    expect(businesses[1]?.businessName).toBe("Gamma");
    expect(businesses[1]?.ownerName).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import {
  BILLING_PLAN_NAMES,
  calculateBusinessMonthlyBilling,
  calculateStoreMonthlyCharge,
  getTierBaseMonthlyAmount,
  resolveStoreBillingTier,
} from "./store-billing-pricing";

describe("resolveStoreBillingTier", () => {
  it("uses Lite for 1–10 employees", () => {
    expect(resolveStoreBillingTier(1)).toBe("TIER_1");
    expect(resolveStoreBillingTier(10)).toBe("TIER_1");
  });

  it("uses Plus for 11–20 employees", () => {
    expect(resolveStoreBillingTier(11)).toBe("TIER_2");
    expect(resolveStoreBillingTier(20)).toBe("TIER_2");
  });

  it("uses Pro for 21–30 employees", () => {
    expect(resolveStoreBillingTier(21)).toBe("TIER_3");
    expect(resolveStoreBillingTier(30)).toBe("TIER_3");
  });

  it("uses Max for 31+ employees", () => {
    expect(resolveStoreBillingTier(31)).toBe("TIER_4");
    expect(resolveStoreBillingTier(40)).toBe("TIER_4");
    expect(resolveStoreBillingTier(50)).toBe("TIER_4");
  });
});

describe("calculateStoreMonthlyCharge", () => {
  it("applies 18% GST on plan base price", () => {
    const charge = calculateStoreMonthlyCharge({
      storeId: "a",
      storeName: "Store A",
      staffCount: 5,
    });

    expect(charge.baseAmount).toBe(4999);
    expect(charge.gstAmount).toBe(Math.round(4999 * 0.18));
    expect(charge.totalAmount).toBe(charge.baseAmount + charge.gstAmount);
    expect(charge.tierLabel).toContain(BILLING_PLAN_NAMES.TIER_1);
  });

  it("selects Plus pricing for 15 employees", () => {
    const charge = calculateStoreMonthlyCharge({
      storeId: "b",
      storeName: "Store B",
      staffCount: 15,
    });

    expect(charge.baseAmount).toBe(8999);
    expect(charge.tier).toBe("TIER_2");
  });

  it("selects Max pricing for 35 employees", () => {
    const charge = calculateStoreMonthlyCharge({
      storeId: "c",
      storeName: "Store C",
      staffCount: 35,
    });

    expect(charge.baseAmount).toBe(19999);
    expect(charge.tier).toBe("TIER_4");
  });
});

describe("calculateBusinessMonthlyBilling", () => {
  it("sums per-store monthly charges for a business", () => {
    const billing = calculateBusinessMonthlyBilling([
      { storeId: "1", storeName: "Alpha", staffCount: 8 },
      { storeId: "2", storeName: "Beta", staffCount: 18 },
    ]);

    const alphaTotal =
      getTierBaseMonthlyAmount("TIER_1") + Math.round(getTierBaseMonthlyAmount("TIER_1") * 0.18);
    const betaTotal =
      getTierBaseMonthlyAmount("TIER_2") + Math.round(getTierBaseMonthlyAmount("TIER_2") * 0.18);

    expect(billing.stores).toHaveLength(2);
    expect(billing.grandTotal).toBe(alphaTotal + betaTotal);
  });
});

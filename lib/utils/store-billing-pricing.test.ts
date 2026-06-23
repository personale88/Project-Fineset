import { describe, expect, it } from "vitest";
import {
  calculateBusinessMonthlyBilling,
  calculateStoreMonthlyCharge,
  getTierBaseMonthlyAmount,
  resolveStoreBillingTier,
} from "@/lib/utils/store-billing-pricing";

describe("resolveStoreBillingTier", () => {
  it("uses tier 1 for 1–10 employees", () => {
    expect(resolveStoreBillingTier(1)).toBe("TIER_1");
    expect(resolveStoreBillingTier(10)).toBe("TIER_1");
  });

  it("uses tier 2 for 11–20 employees", () => {
    expect(resolveStoreBillingTier(11)).toBe("TIER_2");
    expect(resolveStoreBillingTier(20)).toBe("TIER_2");
  });

  it("uses tier 3 for 21+ employees", () => {
    expect(resolveStoreBillingTier(21)).toBe("TIER_3");
    expect(resolveStoreBillingTier(50)).toBe("TIER_3");
  });
});

describe("calculateStoreMonthlyCharge", () => {
  it("applies 18% GST on tier base price", () => {
    const charge = calculateStoreMonthlyCharge({
      storeId: "a",
      storeName: "Store A",
      staffCount: 5,
    });

    expect(charge.baseAmount).toBe(4999);
    expect(charge.gstAmount).toBe(Math.round(4999 * 0.18));
    expect(charge.totalAmount).toBe(charge.baseAmount + charge.gstAmount);
  });

  it("selects tier 2 pricing for 15 employees", () => {
    const charge = calculateStoreMonthlyCharge({
      storeId: "b",
      storeName: "Store B",
      staffCount: 15,
    });

    expect(charge.baseAmount).toBe(8999);
    expect(charge.tier).toBe("TIER_2");
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

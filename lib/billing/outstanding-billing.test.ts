import { describe, expect, it } from "vitest";
import { getActivationBillingPeriod } from "@/lib/billing/activation-cycle";
import {
  calculateOutstandingBilling,
  consolidateOutstandingBilling,
} from "@/lib/billing/outstanding-billing";
import { DEFAULT_BILLING_PRICING_CONFIG } from "@/lib/utils/store-billing-pricing";

const ANCHOR = new Date("2026-01-15T00:00:00.000Z");
const STORES = [
  {
    storeId: "store-1",
    storeName: "Store Alpha",
    staffCount: 3,
    createdAt: "2026-01-15T00:00:00.000Z",
  },
];

describe("calculateOutstandingBilling", () => {
  it("returns zero outstanding when paid through current period", () => {
    const reference = new Date("2026-03-20T12:00:00.000Z");
    const currentPeriod = getActivationBillingPeriod(ANCHOR, reference);
    const outstanding = calculateOutstandingBilling(STORES, DEFAULT_BILLING_PRICING_CONFIG, {
      billingAnchorAt: ANCHOR,
      settlement: {
        paidAt: "2026-03-16T00:00:00.000Z",
        paidThroughPeriodEnd: currentPeriod.periodEnd.toISOString(),
      },
      reference,
    });
    expect(outstanding.unpaidPeriodCount).toBe(0);
    expect(outstanding.grandTotal).toBe(0);
  });

  it("accumulates multiple unpaid periods into one total", () => {
    const reference = new Date("2026-03-26T12:00:00.000Z");
    const paidThrough = getActivationBillingPeriod(ANCHOR, new Date("2026-01-20T00:00:00.000Z"));
    const outstanding = calculateOutstandingBilling(STORES, DEFAULT_BILLING_PRICING_CONFIG, {
      billingAnchorAt: ANCHOR,
      settlement: {
        paidAt: null,
        paidThroughPeriodEnd: paidThrough.periodEnd.toISOString(),
      },
      reference,
    });
    expect(outstanding.unpaidPeriodCount).toBeGreaterThan(1);
    expect(outstanding.grandTotal).toBeGreaterThan(outstanding.periods[0]!.billing.grandTotal);

    const consolidated = consolidateOutstandingBilling(outstanding);
    const storeIds = consolidated.stores.map((store) => store.storeId);
    expect(new Set(storeIds).size).toBe(storeIds.length);
    expect(consolidated.subtotal).toBe(outstanding.subtotal);
    expect(consolidated.grandTotal).toBe(outstanding.grandTotal);
  });
});

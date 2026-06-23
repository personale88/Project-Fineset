import { describe, expect, it } from "vitest";
import {
  getBillingCycleStart,
  getBillingDatesForPaidCycle,
  getPaymentDeadline,
  isWithinPaymentGracePeriod,
} from "@/lib/utils/billing-cycle";

describe("billing-cycle", () => {
  it("uses the 1st as the billing cycle start", () => {
    expect(getBillingCycleStart(new Date("2026-06-15"))).toEqual(
      new Date(2026, 5, 1),
    );
  });

  it("treats days 1–10 as grace period", () => {
    expect(isWithinPaymentGracePeriod(new Date("2026-06-01"))).toBe(true);
    expect(isWithinPaymentGracePeriod(new Date("2026-06-10"))).toBe(true);
    expect(isWithinPaymentGracePeriod(new Date("2026-06-11"))).toBe(false);
  });

  it("sets payment deadline to the 10th", () => {
    const deadline = getPaymentDeadline(new Date("2026-06-05"));
    expect(deadline.getDate()).toBe(10);
    expect(deadline.getMonth()).toBe(5);
  });

  it("extends renewal and expiry dates after payment", () => {
    const { renewalDueAt, dataExpiryAt } = getBillingDatesForPaidCycle(
      new Date("2026-06-05"),
    );
    expect(renewalDueAt).toEqual(new Date(2026, 6, 10));
    expect(dataExpiryAt).toEqual(new Date(2026, 7, 1));
  });
});

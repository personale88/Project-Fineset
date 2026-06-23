import { describe, expect, it } from "vitest";
import {
  formatBillingDeadlineFallback,
  formatOrdinalDay,
  getBillingPaymentStatusCopy,
} from "@/lib/utils/billing-status-labels";
import { DEFAULT_BILLING_CYCLE_SETTINGS } from "@/lib/utils/billing-cycle";

describe("formatOrdinalDay", () => {
  it("formats common ordinals", () => {
    expect(formatOrdinalDay(1)).toBe("1st");
    expect(formatOrdinalDay(2)).toBe("2nd");
    expect(formatOrdinalDay(3)).toBe("3rd");
    expect(formatOrdinalDay(10)).toBe("10th");
    expect(formatOrdinalDay(11)).toBe("11th");
    expect(formatOrdinalDay(21)).toBe("21st");
  });
});

describe("getBillingPaymentStatusCopy", () => {
  it("uses payment due day from cycle settings", () => {
    const copy = getBillingPaymentStatusCopy({
      cycleStartDay: 1,
      paymentDueDay: 15,
      gracePeriodDays: 5,
    });

    expect(copy.hints.dueSoon).toContain("15th");
    expect(copy.hints.dueSoon).toContain("day 5");
    expect(copy.hints.current).toContain("15th");
    expect(copy.labels.dueSoon).toBe("Due soon");
  });

  it("formats deadline fallback from settings", () => {
    expect(formatBillingDeadlineFallback(DEFAULT_BILLING_CYCLE_SETTINGS)).toBe(
      "the 10th of this month",
    );
  });
});

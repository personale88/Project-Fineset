import { describe, expect, it } from "vitest";
import {
  applyPortalBillingAccessForRole,
  resolvePortalBillingAccess,
} from "@/lib/utils/portal-billing-access";

const ANCHOR = "2026-01-15T00:00:00.000Z";

describe("resolvePortalBillingAccess (activation-based)", () => {
  it("allows access within due window after period start", () => {
    const result = resolvePortalBillingAccess(
      { paymentStatus: "UNPAID", paidAt: null, billingAnchorAt: ANCHOR },
      new Date("2026-02-20T12:00:00.000Z"),
    );
    expect(result.canReadData).toBe(true);
    expect(result.reason).toBe("WITHIN_DUE_WINDOW");
    expect(result.isGracePeriod).toBe(true);
  });

  it("restricts all roles after first overdue period", () => {
    const result = resolvePortalBillingAccess(
      { paymentStatus: "UNPAID", paidAt: null, billingAnchorAt: ANCHOR },
      new Date("2026-01-26T12:00:00.000Z"),
    );
    expect(result.consecutiveUnpaidPeriods).toBe(1);
    expect(result.restrictionTier).toBe("METRICS_BLURRED_ALL");
    expect(result.canReadData).toBe(false);
  });

  it("escalates to staff-ok tier after two overdue periods", () => {
    const result = resolvePortalBillingAccess(
      { paymentStatus: "UNPAID", paidAt: null, billingAnchorAt: ANCHOR },
      new Date("2026-02-26T12:00:00.000Z"),
    );
    expect(result.consecutiveUnpaidPeriods).toBe(2);
    expect(result.restrictionTier).toBe("LEADERS_RESTRICTED_STAFF_OK");
  });

  it("allows access when paid for current activation period", () => {
    const result = resolvePortalBillingAccess(
      {
        paymentStatus: "PAID",
        paidAt: "2026-03-16T00:00:00.000Z",
        billingAnchorAt: ANCHOR,
      },
      new Date("2026-03-26T12:00:00.000Z"),
    );
    expect(result.canReadData).toBe(true);
    expect(result.reason).toBe("PAID");
  });

  it("allows access when enforcement is disabled", () => {
    const result = resolvePortalBillingAccess(
      {
        paymentStatus: "UNPAID",
        paidAt: null,
        billingAnchorAt: ANCHOR,
        restrictPortalOnOverdue: false,
      },
      new Date("2026-03-26T12:00:00.000Z"),
    );
    expect(result.canReadData).toBe(true);
    expect(result.reason).toBe("UNPAID_AFTER_DUE");
  });
});

describe("applyPortalBillingAccessForRole", () => {
  it("restores staff access after two overdue periods", () => {
    const base = resolvePortalBillingAccess(
      { paymentStatus: "UNPAID", paidAt: null, billingAnchorAt: ANCHOR },
      new Date("2026-02-26T12:00:00.000Z"),
    );
    const staff = applyPortalBillingAccessForRole(base, "STAFF");
    const owner = applyPortalBillingAccessForRole(base, "BUSINESS_OWNER");

    expect(staff.canReadData).toBe(true);
    expect(staff.metricsBlurred).toBe(false);
    expect(staff.billingRestricted).toBe(false);

    expect(owner.canReadData).toBe(false);
    expect(owner.metricsBlurred).toBe(true);
    expect(owner.billingRestricted).toBe(true);
  });

  it("blocks staff during first overdue period", () => {
    const base = resolvePortalBillingAccess(
      { paymentStatus: "UNPAID", paidAt: null, billingAnchorAt: ANCHOR },
      new Date("2026-01-26T12:00:00.000Z"),
    );
    const staff = applyPortalBillingAccessForRole(base, "STAFF");
    expect(staff.metricsBlurred).toBe(true);
    expect(staff.billingRestricted).toBe(true);
  });
});

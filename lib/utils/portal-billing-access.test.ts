import { describe, expect, it } from "vitest";
import { resolvePortalBillingAccess } from "@/lib/utils/portal-billing-access";

describe("resolvePortalBillingAccess", () => {
  it("allows read access during grace period (1st–10th)", () => {
    const result = resolvePortalBillingAccess(
      { paymentStatus: "UNPAID", paidAt: null },
      new Date("2026-06-05T12:00:00.000Z"),
    );
    expect(result.canReadData).toBe(true);
    expect(result.reason).toBe("GRACE_PERIOD");
  });

  it("allows read access on the 10th", () => {
    const result = resolvePortalBillingAccess(
      { paymentStatus: "UNPAID", paidAt: null },
      new Date("2026-06-10T18:00:00.000Z"),
    );
    expect(result.canReadData).toBe(true);
    expect(result.reason).toBe("GRACE_PERIOD");
  });

  it("blocks read access after the 10th when unpaid", () => {
    const result = resolvePortalBillingAccess(
      { paymentStatus: "UNPAID", paidAt: null },
      new Date("2026-06-11T08:00:00.000Z"),
    );
    expect(result.canReadData).toBe(false);
    expect(result.reason).toBe("UNPAID_AFTER_DEADLINE");
  });

  it("allows read access after the 10th when paid for current cycle", () => {
    const result = resolvePortalBillingAccess(
      {
        paymentStatus: "PAID",
        paidAt: "2026-06-12T10:00:00.000Z",
      },
      new Date("2026-06-15T08:00:00.000Z"),
    );
    expect(result.canReadData).toBe(true);
    expect(result.reason).toBe("PAID");
  });

  it("blocks read access after the 10th when paid in a previous cycle", () => {
    const result = resolvePortalBillingAccess(
      {
        paymentStatus: "PAID",
        paidAt: "2026-05-20T10:00:00.000Z",
      },
      new Date("2026-06-15T08:00:00.000Z"),
    );
    expect(result.canReadData).toBe(false);
    expect(result.reason).toBe("UNPAID_AFTER_DEADLINE");
  });

  it("always allows read access for waived accounts", () => {
    const result = resolvePortalBillingAccess(
      { paymentStatus: "WAIVED", paidAt: null },
      new Date("2026-06-20T08:00:00.000Z"),
    );
    expect(result.canReadData).toBe(true);
    expect(result.reason).toBe("WAIVED");
  });
});

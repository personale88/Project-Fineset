import { describe, expect, it } from "vitest";
import {
  activationProRateFactor,
  countConsecutiveUnpaidPeriods,
  getActivationBillingPeriod,
  isPaidForActivationPeriod,
  isWithinActivationDueWindow,
  resolveBusinessBillingAnchor,
} from "@/lib/billing/activation-cycle";

describe("getActivationBillingPeriod", () => {
  const anchor = new Date("2026-06-15T10:00:00.000Z");

  it("returns period starting on activation day", () => {
    const period = getActivationBillingPeriod(anchor, new Date("2026-06-20T12:00:00.000Z"));
    expect(period.periodStart.getDate()).toBe(15);
    expect(period.periodStart.getMonth()).toBe(5);
    expect(period.dueDate.getDate()).toBe(25);
    expect(period.dueDate.getMonth()).toBe(5);
  });

  it("rolls to previous month when reference is before anchor day", () => {
    const period = getActivationBillingPeriod(anchor, new Date("2026-06-10T12:00:00.000Z"));
    expect(period.periodStart.getDate()).toBe(15);
    expect(period.periodStart.getMonth()).toBe(4);
    expect(period.dueDate.getDate()).toBe(25);
    expect(period.dueDate.getMonth()).toBe(4);
  });
});

describe("countConsecutiveUnpaidPeriods", () => {
  const anchor = new Date("2026-01-15T00:00:00.000Z");

  it("returns 0 before due date", () => {
    expect(
      countConsecutiveUnpaidPeriods(
        anchor,
        { paidAt: null, paidThroughPeriodEnd: null },
        new Date("2026-02-20T00:00:00.000Z"),
      ),
    ).toBe(0);
  });

  it("returns 1 after first overdue due date", () => {
    expect(
      countConsecutiveUnpaidPeriods(
        anchor,
        { paidAt: null, paidThroughPeriodEnd: null },
        new Date("2026-01-26T12:00:00.000Z"),
      ),
    ).toBe(1);
  });

  it("returns 2 after two consecutive overdue periods", () => {
    expect(
      countConsecutiveUnpaidPeriods(
        anchor,
        { paidAt: null, paidThroughPeriodEnd: null },
        new Date("2026-02-26T12:00:00.000Z"),
      ),
    ).toBe(2);
  });

  it("resets when paid for current period", () => {
    expect(
      countConsecutiveUnpaidPeriods(
        anchor,
        {
          paidAt: "2026-03-16T00:00:00.000Z",
          paidThroughPeriodEnd: getActivationBillingPeriod(
            anchor,
            new Date("2026-03-16T00:00:00.000Z"),
          ).periodEnd.toISOString(),
        },
        new Date("2026-03-26T00:00:00.000Z"),
      ),
    ).toBe(0);
  });
});

describe("activationProRateFactor", () => {
  it("returns 1 when store existed before period start", () => {
    const period = getActivationBillingPeriod(
      new Date("2026-01-15T00:00:00.000Z"),
      new Date("2026-03-20T00:00:00.000Z"),
    );
    expect(activationProRateFactor("2026-01-01T00:00:00.000Z", period)).toBe(1);
  });

  it("returns partial factor for mid-cycle activation", () => {
    const period = getActivationBillingPeriod(
      new Date(2026, 0, 15),
      new Date(2026, 2, 20),
    );
    const factor = activationProRateFactor(new Date(2026, 2, 20), period);
    expect(factor).toBeGreaterThan(0);
    expect(factor).toBeLessThan(1);
  });
});

describe("resolveBusinessBillingAnchor", () => {
  it("uses earliest store activation", () => {
    const anchor = resolveBusinessBillingAnchor([
      { createdAt: "2026-06-20T00:00:00.000Z" },
      { createdAt: "2026-06-15T00:00:00.000Z" },
    ]);
    expect(anchor?.getDate()).toBe(15);
    expect(anchor?.getMonth()).toBe(5);
  });
});

describe("isWithinActivationDueWindow", () => {
  it("is true on due date", () => {
    const period = getActivationBillingPeriod(
      new Date("2026-06-15T00:00:00.000Z"),
      new Date("2026-06-20T00:00:00.000Z"),
    );
    expect(isWithinActivationDueWindow(period.dueDate, period)).toBe(true);
  });
});

describe("isPaidForActivationPeriod", () => {
  it("requires payment within the period due window", () => {
    const period = getActivationBillingPeriod(
      new Date("2026-06-15T00:00:00.000Z"),
      new Date("2026-06-20T00:00:00.000Z"),
    );
    expect(isPaidForActivationPeriod("2026-05-20T00:00:00.000Z", period)).toBe(false);
    expect(isPaidForActivationPeriod("2026-06-16T00:00:00.000Z", period)).toBe(true);
  });

  it("honours consolidated paidThroughPeriodEnd", () => {
    const period = getActivationBillingPeriod(
      new Date("2026-06-15T00:00:00.000Z"),
      new Date("2026-06-20T00:00:00.000Z"),
    );
    expect(
      isPaidForActivationPeriod("2026-04-01T00:00:00.000Z", period, period.periodEnd),
    ).toBe(true);
  });
});

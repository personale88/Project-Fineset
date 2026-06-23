import { describe, expect, it } from "vitest";
import { shouldShowBillingReminderActions } from "./billing-reminder-eligibility";

describe("shouldShowBillingReminderActions", () => {
  it("always shows reminders for expired portfolio status", () => {
    expect(shouldShowBillingReminderActions("EXPIRED", "PAID")).toBe(true);
    expect(shouldShowBillingReminderActions("EXPIRED", "UNPAID")).toBe(true);
  });

  it("shows reminders for overdue and due soon when billing is unpaid", () => {
    expect(shouldShowBillingReminderActions("OVERDUE", "UNPAID")).toBe(true);
    expect(shouldShowBillingReminderActions("DUE_SOON", "UNPAID")).toBe(true);
  });

  it("hides reminders for current or paid billing states", () => {
    expect(shouldShowBillingReminderActions("CURRENT", "UNPAID")).toBe(false);
    expect(shouldShowBillingReminderActions("OVERDUE", "PAID")).toBe(false);
  });
});

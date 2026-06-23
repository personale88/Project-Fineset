import { describe, expect, it } from "vitest";
import { shouldSendInvoiceToday } from "@/lib/automation/invoice-schedule";
import { DEFAULT_PLATFORM_AUTOMATION_CONFIG } from "@/lib/automation/default-config";
import type { BusinessPortfolioRow } from "@/types";

const business = {
  businessKey: "biz-1",
  businessName: "Acme",
  ownerName: "Owner",
  businessEmail: "owner@test.local",
  businessPhone: null,
  hasBusinessEmail: true,
  storeCount: 1,
  activeStoreCount: 1,
  inactiveStoreCount: 0,
  dataExpiryAt: null,
  renewalDueAt: "2026-06-15T00:00:00.000Z",
  ownerLastLoginAt: null,
  stores: [],
} satisfies BusinessPortfolioRow;

describe("shouldSendInvoiceToday", () => {
  it("sends on configured invoice day", () => {
    const result = shouldSendInvoiceToday({
      config: DEFAULT_PLATFORM_AUTOMATION_CONFIG,
      business,
      reference: new Date("2026-06-01T10:00:00.000Z"),
      invoiceDay: 1,
      timezone: "UTC",
      isInvoiceDay: true,
    });
    expect(result.shouldSend).toBe(true);
  });

  it("sends days before renewal when enabled", () => {
    const config = {
      ...DEFAULT_PLATFORM_AUTOMATION_CONFIG,
      invoices: {
        ...DEFAULT_PLATFORM_AUTOMATION_CONFIG.invoices,
        sendOnRenewalDue: true,
        daysBeforeRenewal: 3,
      },
    };
    const result = shouldSendInvoiceToday({
      config,
      business,
      reference: new Date("2026-06-12T10:00:00.000Z"),
      invoiceDay: 1,
      timezone: "UTC",
      isInvoiceDay: false,
    });
    expect(result.shouldSend).toBe(true);
  });
});

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { sendBillingWhatsAppReminder } from "@/lib/services/send-billing-whatsapp-reminder";
import { DEFAULT_PLATFORM_AUTOMATION_CONFIG } from "@/lib/automation/default-config";

vi.mock("@/lib/services/stores", () => ({
  getAdminPortfolioStoreRows: vi.fn(),
}));

vi.mock("@/lib/services/automation-config", () => ({
  getAutomationConfig: vi.fn(),
}));

vi.mock("@/lib/automation/billing-cycle-settings", () => ({
  getBillingCycleSettings: vi.fn().mockResolvedValue({
    cycleStartDay: 1,
    paymentDueDay: 10,
    gracePeriodDays: 10,
  }),
}));

vi.mock("@/lib/platform/billing-pricing", () => ({
  getActiveBillingPricingConfig: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/automation/whatsapp-reminder-delivery", () => ({
  deliverManualBillingWhatsAppReminder: vi.fn(),
}));

vi.mock("@/lib/auth/audit", () => ({
  logAuthEvent: vi.fn(),
}));

import { getAdminPortfolioStoreRows } from "@/lib/services/stores";
import { getAutomationConfig } from "@/lib/services/automation-config";
import { deliverManualBillingWhatsAppReminder } from "@/lib/automation/whatsapp-reminder-delivery";

beforeEach(() => {
  vi.mocked(getAdminPortfolioStoreRows).mockResolvedValue([
    {
      storeId: "store-1",
      storeName: "Store 1",
      category: "JEWELRY",
      city: "New York",
      state: "NY",
      isActive: true,
      businessOwnerName: "Owner",
      businessOwnerEmail: "owner@test.local",
      storeManagerName: null,
      storeManagerPhone: "5551234567",
      staffCount: 0,
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z",
      deletedAt: null,
      purgeAt: null,
      dataExpiryAt: null,
      renewalDueAt: "2026-06-15T00:00:00.000Z",
      ownerLastLoginAt: null,
    },
  ]);
  vi.mocked(getAutomationConfig).mockResolvedValue({
    ...DEFAULT_PLATFORM_AUTOMATION_CONFIG,
    whatsApp: {
      ...DEFAULT_PLATFORM_AUTOMATION_CONFIG.whatsApp,
      defaultCountryCode: "1",
    },
  });
  vi.mocked(deliverManualBillingWhatsAppReminder).mockResolvedValue({
    delivery: "deep_link",
    whatsappUrl: "https://wa.me/15551234567",
    phone: "+15551234567",
    message: "Reminder body",
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("sendBillingWhatsAppReminder", () => {
  it("delegates manual delivery to the shared WhatsApp reminder helper", async () => {
    const result = await sendBillingWhatsAppReminder("owner@test.local", "admin@test.local");

    expect(deliverManualBillingWhatsAppReminder).toHaveBeenCalledWith(
      expect.objectContaining({
        businessKey: "owner@test.local",
        countryCode: "1",
        sentByEmail: "admin@test.local",
      }),
    );
    expect(result.delivery).toBe("deep_link");
    expect(result.phone).toBe("+15551234567");
  });
});

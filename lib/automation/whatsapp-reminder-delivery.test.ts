import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  automationWhatsAppRemindersQueueFollowUpsOnly,
  deliverManualBillingWhatsAppReminder,
  queueAutomationWhatsAppReminder,
} from "@/lib/automation/whatsapp-reminder-delivery";

vi.mock("@/lib/services/billing-accounts", () => ({
  createBillingFollowUp: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/automation/delivery-log", () => ({
  recordAutomationDelivery: vi.fn().mockResolvedValue(undefined),
  releaseAutomationDeliveryClaim: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/whatsapp/send-message", () => ({
  isWhatsAppApiConfigured: vi.fn(),
  sendWhatsAppTextMessage: vi.fn().mockResolvedValue(undefined),
}));

import { createBillingFollowUp } from "@/lib/services/billing-accounts";
import { recordAutomationDelivery } from "@/lib/automation/delivery-log";
import {
  isWhatsAppApiConfigured,
  sendWhatsAppTextMessage,
} from "@/lib/whatsapp/send-message";

afterEach(() => {
  vi.clearAllMocks();
});

describe("automationWhatsAppRemindersQueueFollowUpsOnly", () => {
  it("documents that scheduled automation never sends via the WhatsApp API", () => {
    expect(automationWhatsAppRemindersQueueFollowUpsOnly()).toBe(true);
  });
});

describe("queueAutomationWhatsAppReminder", () => {
  it("queues a billing follow-up during live automation runs", async () => {
    const nextFollowUpAt = new Date("2026-06-02T10:00:00.000Z");

    const result = await queueAutomationWhatsAppReminder({
      businessKey: "owner@test.local",
      businessName: "Store Alpha",
      formattedPhone: "+919876543210",
      message: "Reminder body",
      nextFollowUpAt,
      dedupeKey: "owner@test.local:WHATSAPP_REMINDER:2026-06:before_3",
      dryRun: false,
    });

    expect(createBillingFollowUp).toHaveBeenCalledWith(
      expect.objectContaining({
        businessKey: "owner@test.local",
        channel: "WHATSAPP",
        outcome: "RESCHEDULED",
        notes: expect.stringContaining("[Automation] WhatsApp reminder queued for +919876543210."),
      }),
    );
    expect(recordAutomationDelivery).toHaveBeenCalledWith(
      expect.objectContaining({
        businessKey: "owner@test.local",
        actionType: "WHATSAPP_REMINDER",
        status: "QUEUED",
      }),
    );
    expect(result.whatsAppQueued).toBe(1);
    expect(result.detail.message).toContain("send from Billing");
    expect(sendWhatsAppTextMessage).not.toHaveBeenCalled();
  });

  it("does not write follow-ups during dry runs", async () => {
    const result = await queueAutomationWhatsAppReminder({
      businessKey: "owner@test.local",
      businessName: "Store Alpha",
      formattedPhone: "+919876543210",
      message: "Reminder body",
      nextFollowUpAt: new Date("2026-06-02T10:00:00.000Z"),
      dedupeKey: "owner@test.local:WHATSAPP_REMINDER:2026-06:before_3",
      dryRun: true,
    });

    expect(createBillingFollowUp).not.toHaveBeenCalled();
    expect(result.detail.status).toBe("queued");
    expect(sendWhatsAppTextMessage).not.toHaveBeenCalled();
  });
});

describe("deliverManualBillingWhatsAppReminder", () => {
  beforeEach(() => {
    vi.mocked(isWhatsAppApiConfigured).mockReturnValue(false);
  });

  it("queues a follow-up without calling the WhatsApp API when credentials are missing", async () => {
    const result = await deliverManualBillingWhatsAppReminder({
      businessKey: "owner@test.local",
      resolvedPhone: { raw: "9876543210", normalized: "919876543210" },
      countryCode: "91",
      message: "Manual reminder",
      sentByEmail: "admin@test.local",
    });

    expect(sendWhatsAppTextMessage).not.toHaveBeenCalled();
    expect(createBillingFollowUp).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: "RESCHEDULED",
        notes: expect.stringContaining("WhatsApp payment reminder queued for +919876543210."),
      }),
    );
    expect(result.delivery).toBe("deep_link");
    expect(result.whatsappUrl).toContain("https://wa.me/");
  });

  it("sends via the WhatsApp API when credentials are configured", async () => {
    vi.mocked(isWhatsAppApiConfigured).mockReturnValue(true);

    const result = await deliverManualBillingWhatsAppReminder({
      businessKey: "owner@test.local",
      resolvedPhone: { raw: "9876543210", normalized: "919876543210" },
      countryCode: "91",
      message: "Manual reminder",
    });

    expect(sendWhatsAppTextMessage).toHaveBeenCalledWith({
      toPhone: "9876543210",
      message: "Manual reminder",
      countryCode: "91",
    });
    expect(result.delivery).toBe("sent");
    expect(result.whatsappUrl).toBeNull();
  });

  it("queues a follow-up when the WhatsApp API send fails", async () => {
    vi.mocked(isWhatsAppApiConfigured).mockReturnValue(true);
    vi.mocked(sendWhatsAppTextMessage).mockRejectedValueOnce(new Error("API down"));

    const result = await deliverManualBillingWhatsAppReminder({
      businessKey: "owner@test.local",
      resolvedPhone: { raw: "9876543210", normalized: "919876543210" },
      countryCode: "91",
      message: "Manual reminder",
    });

    expect(result.delivery).toBe("queued");
    expect(createBillingFollowUp).toHaveBeenCalledWith(
      expect.objectContaining({
        notes: expect.stringContaining("WhatsApp API send failed — reminder queued for +919876543210."),
      }),
    );
  });
});

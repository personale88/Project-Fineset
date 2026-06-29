import type { AutomationRunDetail } from "@/lib/automation/types";
import { formatNormalizedWhatsAppPhone } from "@/lib/automation/whatsapp-phone";
import {
  recordAutomationDelivery,
  releaseAutomationDeliveryClaim,
} from "@/lib/automation/delivery-log";
import { createBillingFollowUp } from "@/lib/services/billing-accounts";
import { buildWhatsAppUrl } from "@/lib/utils/whatsapp-link";
import { isWhatsAppApiConfigured, sendWhatsAppTextMessage } from "@/lib/whatsapp/send-message";

export type BillingWhatsAppReminderDelivery = "sent" | "queued" | "deep_link";

export interface BillingWhatsAppReminderDeliveryResult {
  delivery: BillingWhatsAppReminderDelivery;
  whatsappUrl: string | null;
  phone: string;
  message: string;
}

/** Scheduled automation always queues billing follow-ups; it never sends via the WhatsApp API. */
export function automationWhatsAppRemindersQueueFollowUpsOnly(): boolean {
  return true;
}

export async function queueAutomationWhatsAppReminder(input: {
  businessKey: string;
  businessName: string;
  formattedPhone: string;
  message: string;
  nextFollowUpAt: Date;
  dedupeKey: string;
  dryRun: boolean;
}): Promise<{ whatsAppQueued: number; detail: AutomationRunDetail }> {
  if (input.dryRun) {
    return {
      whatsAppQueued: 1,
      detail: {
        action: "whatsapp_reminder",
        businessKey: input.businessKey,
        businessName: input.businessName,
        channel: "WHATSAPP",
        status: "queued",
        message: `Would queue WhatsApp follow-up for ${input.formattedPhone}`,
      },
    };
  }

  try {
    await createBillingFollowUp({
      businessKey: input.businessKey,
      channel: "WHATSAPP",
      outcome: "RESCHEDULED",
      notes: `[Automation] WhatsApp reminder queued for ${input.formattedPhone}. ${input.message.slice(0, 400)}`,
      nextFollowUpAt: input.nextFollowUpAt,
      createdByEmail: "automation@fineset.local",
      createdByName: "Automation",
    });
    await recordAutomationDelivery({
      businessKey: input.businessKey,
      actionType: "WHATSAPP_REMINDER",
      dedupeKey: input.dedupeKey,
      channel: "WHATSAPP",
      status: "QUEUED",
    });

    return {
      whatsAppQueued: 1,
      detail: {
        action: "whatsapp_reminder",
        businessKey: input.businessKey,
        businessName: input.businessName,
        channel: "WHATSAPP",
        status: "success",
        message: `Follow-up scheduled for ${input.formattedPhone} — send from Billing`,
      },
    };
  } catch (error) {
    await releaseAutomationDeliveryClaim(input.dedupeKey);
    throw error;
  }
}

export async function deliverManualBillingWhatsAppReminder(input: {
  businessKey: string;
  resolvedPhone: { raw: string; normalized: string };
  countryCode: string;
  message: string;
  sentByEmail?: string | null;
}): Promise<BillingWhatsAppReminderDeliveryResult> {
  const phone = formatNormalizedWhatsAppPhone(input.resolvedPhone.normalized);
  const whatsappUrl = buildWhatsAppUrl(input.resolvedPhone.raw, input.message, input.countryCode);

  if (isWhatsAppApiConfigured()) {
    try {
      await sendWhatsAppTextMessage({
        toPhone: input.resolvedPhone.raw,
        message: input.message,
        countryCode: input.countryCode,
      });
      await createBillingFollowUp({
        businessKey: input.businessKey,
        channel: "WHATSAPP",
        outcome: "OTHER",
        notes: `WhatsApp payment reminder sent to ${phone}.\n\n${input.message}`,
        createdByEmail: input.sentByEmail ?? null,
        createdByName: null,
      });

      return {
        delivery: "sent",
        whatsappUrl: null,
        phone,
        message: input.message,
      };
    } catch {
      // Fall back to queue + deep link when the API send fails.
    }
  }

  if (!whatsappUrl) {
    throw new Error("The phone number on file is not valid for WhatsApp.");
  }

  const queueNotePrefix = isWhatsAppApiConfigured()
    ? `WhatsApp API send failed — reminder queued for ${phone}.`
    : `WhatsApp payment reminder queued for ${phone}. Send from Billing.`;

  await createBillingFollowUp({
    businessKey: input.businessKey,
    channel: "WHATSAPP",
    outcome: "RESCHEDULED",
    notes: `${queueNotePrefix}\n\n${input.message}`,
    createdByEmail: input.sentByEmail ?? null,
    createdByName: null,
  });

  return {
    delivery: isWhatsAppApiConfigured() ? "queued" : "deep_link",
    whatsappUrl,
    phone,
    message: input.message,
  };
}

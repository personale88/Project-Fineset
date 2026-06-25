import { logAuthEvent } from "@/lib/auth/audit";
import { sendPaymentNotReceivedEmail } from "@/lib/emails/automation-emails";
import { createBillingFollowUp } from "@/lib/services/billing-accounts";
import { getPlatformBranding } from "@/lib/platform/branding";
import { groupStoresByBusiness, resolveBusinessPhone } from "@/lib/utils/group-stores-by-business";
import { formatCurrency } from "@/lib/utils/formatters";
import { getAdminPortfolioStoreRows } from "@/lib/services/stores";
import {
  isWhatsAppApiConfigured,
  sendWhatsAppTextMessage,
} from "@/lib/whatsapp/send-message";

export interface PaymentNotReceivedNotificationInput {
  businessKey: string;
  businessName: string;
  businessEmail: string | null;
  invoiceNumber: string | null;
  amountInr: number;
  submittedByName: string | null;
  reviewedByEmail: string;
}

export interface PaymentNotReceivedNotificationResult {
  emailSent: boolean;
  whatsAppSent: boolean;
  whatsAppQueued: boolean;
}

export function buildPaymentNotReceivedMessage(input: {
  greetingName: string;
  businessName: string;
  amountInr: number;
  invoiceNumber: string | null;
  platformName: string;
  forWhatsApp?: boolean;
}): string {
  const amount = formatCurrency(input.amountInr);
  const invoice = input.invoiceNumber?.trim() || "your invoice";
  const businessLabel = input.forWhatsApp ? `*${input.businessName}*` : input.businessName;
  const amountLabel = input.forWhatsApp ? `*${amount}*` : amount;
  const invoiceLabel = input.forWhatsApp ? `*${invoice}*` : invoice;

  return [
    `Hi ${input.greetingName},`,
    "",
    `We reviewed your payment confirmation for ${businessLabel} but could not verify receipt of ${amountLabel} for invoice ${invoiceLabel}.`,
    "",
    "Please complete the UPI payment or reply with your transaction reference if payment was already made.",
    "",
    `— ${input.platformName} Team`,
  ].join("\n");
}

async function resolveBusinessPhoneForKey(businessKey: string): Promise<string | null> {
  const stores = await getAdminPortfolioStoreRows();
  const businesses = groupStoresByBusiness(stores);
  const business = businesses.find((row) => row.businessKey === businessKey);
  if (!business) return null;
  return resolveBusinessPhone(business.stores);
}

export async function sendPaymentNotReceivedNotifications(
  input: PaymentNotReceivedNotificationInput,
): Promise<PaymentNotReceivedNotificationResult> {
  const branding = await getPlatformBranding();
  const greetingName =
    input.submittedByName?.trim() || input.businessName.trim() || "there";
  const message = buildPaymentNotReceivedMessage({
    greetingName,
    businessName: input.businessName,
    amountInr: input.amountInr,
    invoiceNumber: input.invoiceNumber,
    platformName: branding.platformName,
    forWhatsApp: true,
  });
  const emailMessage = buildPaymentNotReceivedMessage({
    greetingName,
    businessName: input.businessName,
    amountInr: input.amountInr,
    invoiceNumber: input.invoiceNumber,
    platformName: branding.platformName,
  });

  let emailSent = false;
  let whatsAppSent = false;
  let whatsAppQueued = false;

  const recipientEmail = input.businessEmail?.trim().toLowerCase();
  if (recipientEmail) {
    try {
      await sendPaymentNotReceivedEmail({
        to: recipientEmail,
        businessName: input.businessName,
        amountInr: input.amountInr,
        invoiceNumber: input.invoiceNumber,
        bodyText: emailMessage,
        branding,
      });
      emailSent = true;
    } catch (error) {
      console.error("[billing] payment not received email failed", error);
    }
  }

  const phone = await resolveBusinessPhoneForKey(input.businessKey);
  if (phone && isWhatsAppApiConfigured()) {
    try {
      await sendWhatsAppTextMessage({ toPhone: phone, message });
      whatsAppSent = true;
    } catch (error) {
      console.error("[billing] payment not received WhatsApp failed", error);
    }
  } else if (phone && !isWhatsAppApiConfigured()) {
    try {
      await createBillingFollowUp({
        businessKey: input.businessKey,
        channel: "WHATSAPP",
        outcome: "OTHER",
        notes: `[Auto] Payment not received — WhatsApp API unavailable. Prepared message for ${phone}:\n\n${message}`,
        createdByEmail: input.reviewedByEmail,
      });
      whatsAppQueued = true;
    } catch (error) {
      console.error("[billing] payment not received WhatsApp follow-up failed", error);
    }
  } else if (!phone) {
    console.warn(
      `[billing] payment not received WhatsApp skipped — no phone for ${input.businessKey}`,
    );
  }

  void logAuthEvent({
    event: "BILLING_PAYMENT_STATUS_CHANGED",
    email: input.reviewedByEmail,
    metadata: {
      businessKey: input.businessKey,
      businessName: input.businessName,
      action: "payment_not_received_notifications",
      emailSent,
      whatsAppSent,
      whatsAppQueued,
      invoiceNumber: input.invoiceNumber,
    },
  });

  return { emailSent, whatsAppSent, whatsAppQueued };
}

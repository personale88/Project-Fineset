import { createBillingFollowUp } from "@/lib/services/billing-accounts";
import { logAuthEvent } from "@/lib/auth/audit";
import { getBillingCycleSettings } from "@/lib/automation/billing-cycle-settings";
import { DEFAULT_PLATFORM_AUTOMATION_CONFIG } from "@/lib/automation/default-config";
import {
  deliverManualBillingWhatsAppReminder,
  type BillingWhatsAppReminderDeliveryResult,
} from "@/lib/automation/whatsapp-reminder-delivery";
import {
  formatNormalizedWhatsAppPhone,
  resolveWhatsAppPhoneForBusiness,
} from "@/lib/automation/whatsapp-phone";
import { getAutomationConfig } from "@/lib/services/automation-config";
import { getBusinessPaymentStatus } from "@/lib/utils/admin-portfolio-filters";
import { getBillingPaymentStatusLabel } from "@/lib/utils/billing-status-labels";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import { groupStoresByBusiness, resolveBusinessPhone } from "@/lib/utils/group-stores-by-business";
import { getActiveBillingPricingConfig } from "@/lib/platform/billing-pricing";
import { calculateBusinessMonthlyBilling, type BillingPricingConfig } from "@/lib/utils/store-billing-pricing";
import { getAdminPortfolioStoreRows } from "@/lib/services/stores";
import type { BusinessPortfolioRow } from "@/types";
import type { BillingCycleSettings } from "@/lib/utils/billing-cycle";
import { DEFAULT_BILLING_CYCLE_SETTINGS } from "@/lib/utils/billing-cycle";

export class SendBillingWhatsAppReminderError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "SendBillingWhatsAppReminderError";
  }
}

async function resolveBusiness(businessKey: string): Promise<BusinessPortfolioRow | null> {
  const stores = await getAdminPortfolioStoreRows();
  const businesses = groupStoresByBusiness(stores);
  return businesses.find((business) => business.businessKey === businessKey) ?? null;
}

function displayDate(value: string | null): string {
  return value ? formatDate(value) : "Not set";
}

export function buildBillingWhatsAppReminderMessage(
  business: BusinessPortfolioRow,
  cycleSettings: BillingCycleSettings = DEFAULT_BILLING_CYCLE_SETTINGS,
  pricingConfig?: BillingPricingConfig,
): string {
  const billing = calculateBusinessMonthlyBilling(business.stores, pricingConfig);
  const greetingName = business.ownerName?.trim() || business.businessName;
  const portfolioStatus = getBusinessPaymentStatus(
    business,
    new Date(),
    undefined,
    undefined,
    cycleSettings,
  );
  const paymentStatus = getBillingPaymentStatusLabel(portfolioStatus, cycleSettings);

  if (portfolioStatus === "EXPIRED") {
    return [
      `Hi ${greetingName},`,
      "",
      `Your Tribly subscription for *${business.businessName}* has *expired*.`,
      "",
      `Data access ended: ${displayDate(business.dataExpiryAt)}`,
      `Amount due: *${formatCurrency(billing.grandTotal)}* (incl. 18% GST)`,
      `Renewal due: ${displayDate(business.renewalDueAt)}`,
      "",
      "Renew now to restore access for your stores and team.",
      "Reply if payment is already done or you need the invoice resent.",
      "",
      "— Tribly Team",
    ].join("\n");
  }

  return [
    `Hi ${greetingName},`,
    "",
    `This is a friendly reminder about your Tribly subscription for *${business.businessName}*.`,
    "",
    `Amount due: *${formatCurrency(billing.grandTotal)}* (incl. 18% GST)`,
    `Renewal due: ${displayDate(business.renewalDueAt)}`,
    `Status: ${paymentStatus}`,
    "",
    "Please let us know if payment is already done or if you need the invoice resent.",
    "",
    "— Tribly Team",
  ].join("\n");
}

export async function sendBillingWhatsAppReminder(
  businessKey: string,
  sentByEmail?: string | null,
): Promise<BillingWhatsAppReminderDeliveryResult> {
  const business = await resolveBusiness(businessKey);
  if (!business) {
    throw new SendBillingWhatsAppReminderError("Business not found.", 404);
  }

  const phone = resolveBusinessPhone(business.stores);
  if (!phone) {
    throw new SendBillingWhatsAppReminderError(
      "No phone number on file. Add a store manager phone before sending a WhatsApp reminder.",
      400,
    );
  }

  const config = await getAutomationConfig().catch(() => null);
  const countryCode =
    config?.whatsApp.defaultCountryCode ??
    DEFAULT_PLATFORM_AUTOMATION_CONFIG.whatsApp.defaultCountryCode;
  const resolvedPhone = resolveWhatsAppPhoneForBusiness(business, countryCode);
  if (!resolvedPhone) {
    throw new SendBillingWhatsAppReminderError(
      "The phone number on file is not valid for WhatsApp.",
      400,
    );
  }

  const cycleSettings = await getBillingCycleSettings();
  const pricingConfig = await getActiveBillingPricingConfig();
  const message = buildBillingWhatsAppReminderMessage(
    business,
    cycleSettings,
    pricingConfig,
  );

  const result = await deliverManualBillingWhatsAppReminder({
    businessKey,
    resolvedPhone,
    countryCode,
    message,
    sentByEmail,
  });

  void logAuthEvent({
    event: "BILLING_WHATSAPP_REMINDER",
    email: sentByEmail ?? null,
    metadata: {
      businessKey,
      phone: formatNormalizedWhatsAppPhone(resolvedPhone.normalized),
      businessName: business.businessName,
      delivery: result.delivery,
    },
  });

  return result;
}

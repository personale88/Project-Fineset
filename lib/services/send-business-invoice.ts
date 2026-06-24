import { getAppBaseUrl } from "@/lib/auth/get-app-url";
import { logAuthEvent } from "@/lib/auth/audit";
import { getBillingCycleSettings } from "@/lib/automation/billing-cycle-settings";
import { getActivationBillingPeriod } from "@/lib/billing/activation-cycle";
import {
  consolidateOutstandingBilling,
  outstandingPeriodBreakdownJson,
} from "@/lib/billing/outstanding-billing";
import {
  buildInvoiceNumber,
  renderInvoiceEmailHtml,
  renderInvoiceEmailText,
} from "@/lib/emails/render-invoice-email";
import { SmtpNotConfiguredError, SmtpSendError } from "@/lib/email/errors";
import { isSmtpConfigured } from "@/lib/email/env";
import { sendMail } from "@/lib/email/send-mail";
import {
  buildOutstandingBillingForBusinessKey,
  logBillingInvoice,
} from "@/lib/services/billing-accounts";
import { resolveBillingAnchorForBusinessKey } from "@/lib/services/billing-anchor";
import { getBusinessPaymentStatus } from "@/lib/utils/admin-portfolio-filters";
import { getBillingPaymentStatusLabel } from "@/lib/utils/billing-status-labels";
import { groupStoresByBusiness } from "@/lib/utils/group-stores-by-business";
import { formatDate } from "@/lib/utils/formatters";
import { getPlatformBranding } from "@/lib/platform/branding";
import { getActiveBillingPricingConfig } from "@/lib/platform/billing-pricing";
import { calculateBusinessMonthlyBilling } from "@/lib/utils/store-billing-pricing";
import { getAdminPortfolioStoreRows } from "@/lib/services/stores";
import type { BusinessPortfolioRow } from "@/types";

export class SendBusinessInvoiceError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "SendBusinessInvoiceError";
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

export async function sendBusinessInvoice(
  businessKey: string,
  sentByEmail?: string | null,
): Promise<{ invoiceNumber: string; sentTo: string; grandTotal: number }> {
  if (!isSmtpConfigured()) {
    throw new SendBusinessInvoiceError(
      "Email is not configured. Set SMTP_* environment variables.",
      503,
    );
  }

  const business = await resolveBusiness(businessKey);
  if (!business) {
    throw new SendBusinessInvoiceError("Business not found.", 404);
  }

  const recipientEmail = business.businessEmail?.trim().toLowerCase();
  if (!recipientEmail) {
    throw new SendBusinessInvoiceError(
      "This business has no email address. Add a business owner email before sending an invoice.",
      400,
    );
  }

  const reference = new Date();
  const invoiceNumber = buildInvoiceNumber(businessKey, reference);
  const invoiceDate = formatDate(reference);
  const cycleSettings = await getBillingCycleSettings();
  const portfolioStatus = getBusinessPaymentStatus(
    business,
    reference,
    undefined,
    undefined,
    cycleSettings,
  );
  const paymentStatus = getBillingPaymentStatusLabel(portfolioStatus, cycleSettings);
  const pricingConfig = await getActiveBillingPricingConfig();
  const billingAnchorAt = await resolveBillingAnchorForBusinessKey(
    businessKey,
    business.billingAnchorAt,
  );
  const outstanding =
    (await buildOutstandingBillingForBusinessKey(businessKey, reference)) ??
    null;
  const billing =
    outstanding && outstanding.unpaidPeriodCount > 0
      ? consolidateOutstandingBilling(outstanding)
      : calculateBusinessMonthlyBilling(business.stores, pricingConfig, {
          billingAnchorAt,
          reference,
        });
  const outstandingBilling =
    outstanding && outstanding.unpaidPeriodCount > 0 ? outstanding : undefined;
  const branding = await getPlatformBranding();
  const currentPeriod = billingAnchorAt
    ? getActivationBillingPeriod(billingAnchorAt, reference)
    : null;

  const emailContent = {
    invoiceNumber,
    invoiceDate,
    businessName: business.businessName,
    ownerName: business.ownerName ?? business.businessName,
    businessEmail: recipientEmail,
    renewalDue: currentPeriod
      ? formatDate(currentPeriod.dueDate)
      : displayDate(business.renewalDueAt),
    dataExpiry: currentPeriod
      ? formatDate(currentPeriod.periodEnd)
      : displayDate(business.dataExpiryAt),
    paymentStatus,
    siteUrl: getAppBaseUrl(),
    billing,
    outstandingBilling,
    platformName: branding.platformName,
    supportEmail: branding.supportEmail,
  };

  const subject =
    outstandingBilling && outstandingBilling.unpaidPeriodCount > 1
      ? `Consolidated invoice ${invoiceNumber} — ${business.businessName}`
      : `Invoice ${invoiceNumber} — ${business.businessName}`;

  try {
    await sendMail({
      to: recipientEmail,
      subject,
      text: renderInvoiceEmailText(emailContent),
      html: renderInvoiceEmailHtml(emailContent),
    });
  } catch (error) {
    if (error instanceof SmtpNotConfiguredError) {
      throw new SendBusinessInvoiceError(error.message, 503);
    }
    if (error instanceof SmtpSendError) {
      throw new SendBusinessInvoiceError(error.message, 502);
    }
    throw error;
  }

  const firstPeriod = outstandingBilling?.periods[0];
  const lastPeriod = outstandingBilling?.periods.at(-1);

  await logBillingInvoice({
    businessKey,
    invoiceNumber,
    sentTo: recipientEmail,
    grandTotal: billing.grandTotal,
    sentByEmail,
    periodStart: firstPeriod ? new Date(firstPeriod.periodStart) : currentPeriod?.periodStart,
    periodEnd: lastPeriod ? new Date(lastPeriod.periodEnd) : currentPeriod?.periodEnd,
    unpaidPeriodCount: outstandingBilling?.unpaidPeriodCount ?? 1,
    periodBreakdown: outstandingBilling
      ? outstandingPeriodBreakdownJson(outstandingBilling)
      : undefined,
  });

  await logAuthEvent({
    event: "BILLING_INVOICE_SENT",
    email: sentByEmail ?? recipientEmail,
    metadata: {
      businessKey,
      invoiceNumber,
      sentTo: recipientEmail,
      grandTotal: billing.grandTotal,
      unpaidPeriodCount: outstandingBilling?.unpaidPeriodCount ?? 1,
    },
  });

  return { invoiceNumber, sentTo: recipientEmail, grandTotal: billing.grandTotal };
}

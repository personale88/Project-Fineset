import { getAppBaseUrl } from "@/lib/auth/get-app-url";
import { logAuthEvent } from "@/lib/auth/audit";
import { getBillingCycleSettings } from "@/lib/automation/billing-cycle-settings";
import {
  buildInvoiceNumber,
  renderInvoiceEmailHtml,
  renderInvoiceEmailText,
} from "@/lib/emails/render-invoice-email";
import { SmtpNotConfiguredError, SmtpSendError } from "@/lib/email/errors";
import { isSmtpConfigured } from "@/lib/email/env";
import { sendMail } from "@/lib/email/send-mail";
import { logBillingInvoice } from "@/lib/services/billing-accounts";
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

  const invoiceNumber = buildInvoiceNumber(businessKey);
  const invoiceDate = formatDate(new Date());
  const cycleSettings = await getBillingCycleSettings();
  const portfolioStatus = getBusinessPaymentStatus(
    business,
    new Date(),
    undefined,
    undefined,
    cycleSettings,
  );
  const paymentStatus = getBillingPaymentStatusLabel(portfolioStatus, cycleSettings);
  const pricingConfig = await getActiveBillingPricingConfig();
  const billing = calculateBusinessMonthlyBilling(business.stores, pricingConfig);
  const branding = await getPlatformBranding();

  const emailContent = {
    invoiceNumber,
    invoiceDate,
    businessName: business.businessName,
    ownerName: business.ownerName ?? business.businessName,
    businessEmail: recipientEmail,
    renewalDue: displayDate(business.renewalDueAt),
    dataExpiry: displayDate(business.dataExpiryAt),
    paymentStatus,
    siteUrl: getAppBaseUrl(),
    billing,
    platformName: branding.platformName,
    supportEmail: branding.supportEmail,
  };

  const subject = `Invoice ${invoiceNumber} — ${business.businessName}`;

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

  await logBillingInvoice({
    businessKey,
    invoiceNumber,
    sentTo: recipientEmail,
    grandTotal: billing.grandTotal,
    sentByEmail,
  });

  await logAuthEvent({
    event: "BILLING_INVOICE_SENT",
    email: sentByEmail ?? recipientEmail,
    metadata: {
      businessKey,
      invoiceNumber,
      sentTo: recipientEmail,
      grandTotal: billing.grandTotal,
    },
  });

  return { invoiceNumber, sentTo: recipientEmail, grandTotal: billing.grandTotal };
}

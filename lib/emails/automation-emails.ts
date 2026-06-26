import { sendMail } from "@/lib/email/send-mail";
import { isSmtpConfigured } from "@/lib/email/env";
import {
  billingFromName,
  getPlatformBranding,
  type PlatformBranding,
} from "@/lib/platform/branding";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import { escapeHtml } from "@/lib/utils/escape-html";

async function resolveBranding(
  branding?: PlatformBranding,
): Promise<PlatformBranding> {
  return branding ?? (await getPlatformBranding());
}

export async function sendPaymentConfirmationEmail(input: {
  to: string;
  businessName: string;
  paidAt: Date;
  invoiceNumber?: string | null;
  branding?: PlatformBranding;
}): Promise<void> {
  if (!isSmtpConfigured()) return;

  const branding = await resolveBranding(input.branding);
  const signature = billingFromName(branding);
  const paidDate = formatDate(input.paidAt);
  const safeBusinessName = escapeHtml(input.businessName);
  const safeInvoice = input.invoiceNumber ? escapeHtml(input.invoiceNumber) : null;
  const safePaidDate = escapeHtml(paidDate);
  const safeSignature = escapeHtml(signature);
  const safeSupport = branding.supportEmail ? escapeHtml(branding.supportEmail) : null;
  const subject = `Payment received — ${input.businessName}`;
  const text = [
    `Hello,`,
    ``,
    `We have received your payment for ${input.businessName}.`,
    input.invoiceNumber ? `Invoice: ${input.invoiceNumber}` : null,
    `Paid on: ${paidDate}`,
    ``,
    `Your portal access is active for the current billing cycle.`,
    ``,
    `Thank you,`,
    signature,
    branding.supportEmail ? `Support: ${branding.supportEmail}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    <p>Hello,</p>
    <p>We have received your payment for <strong>${safeBusinessName}</strong>.</p>
    ${safeInvoice ? `<p>Invoice: <strong>${safeInvoice}</strong></p>` : ""}
    <p>Paid on: <strong>${safePaidDate}</strong></p>
    <p>Your portal access is active for the current billing cycle.</p>
    <p>Thank you,<br/>${safeSignature}</p>
    ${safeSupport ? `<p>Support: <a href="mailto:${safeSupport}">${safeSupport}</a></p>` : ""}
  `;

  await sendMail({ to: input.to, subject, text, html });
}

export async function sendPaymentNotReceivedEmail(input: {
  to: string;
  businessName: string;
  amountInr: number;
  invoiceNumber?: string | null;
  bodyText: string;
  branding?: PlatformBranding;
}): Promise<void> {
  if (!isSmtpConfigured()) {
    throw new Error("Email is not configured.");
  }

  const branding = await resolveBranding(input.branding);
  const signature = billingFromName(branding);
  const amount = formatCurrency(input.amountInr);
  const subject = `Payment not verified — ${input.businessName}`;
  const text = [
    input.bodyText,
    branding.supportEmail ? `\nSupport: ${branding.supportEmail}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const safeBody = escapeHtml(input.bodyText).replaceAll("\n", "<br/>");
  const safeAmount = escapeHtml(amount);
  const safeInvoice = input.invoiceNumber ? escapeHtml(input.invoiceNumber) : null;
  const safeSupport = branding.supportEmail ? escapeHtml(branding.supportEmail) : null;
  const safeSignature = escapeHtml(signature);

  const html = `
    <p>${safeBody}</p>
    <p>Amount: <strong>${safeAmount}</strong></p>
    ${safeInvoice ? `<p>Invoice: <strong>${safeInvoice}</strong></p>` : ""}
    ${safeSupport ? `<p>Support: <a href="mailto:${safeSupport}">${safeSupport}</a></p>` : ""}
    <p>${safeSignature}</p>
  `;

  await sendMail({ to: input.to, subject, text, html });
}

export async function sendPaymentReminderEmail(input: {
  to: string;
  businessName: string;
  amountInr: number;
  dueDate: Date;
  daysUntilDue: number;
  branding?: PlatformBranding;
}): Promise<void> {
  if (!isSmtpConfigured()) return;

  const branding = await resolveBranding(input.branding);
  const signature = billingFromName(branding);
  const dueLabel = formatDate(input.dueDate);
  const amount = formatCurrency(input.amountInr);
  const urgency =
    input.daysUntilDue < 0
      ? `${Math.abs(input.daysUntilDue)} day(s) overdue`
      : input.daysUntilDue === 0
        ? "due today"
        : `due in ${input.daysUntilDue} day(s)`;

  const subject = `Payment reminder — ${input.businessName} (${urgency})`;
  const text = [
    `Hello,`,
    ``,
    `This is a friendly reminder that your ${branding.platformName} subscription for ${input.businessName} is ${urgency}.`,
    `Amount due: ${amount}`,
    `Payment due date: ${dueLabel}`,
    ``,
    `Please complete payment to avoid service interruption.`,
    branding.supportEmail ? `Contact support: ${branding.supportEmail}` : null,
    ``,
    signature,
  ]
    .filter(Boolean)
    .join("\n");

  const safePlatform = escapeHtml(branding.platformName);
  const safeBusiness = escapeHtml(input.businessName);
  const safeUrgency = escapeHtml(urgency);
  const safeAmount = escapeHtml(amount);
  const safeDue = escapeHtml(dueLabel);
  const safeSupport = branding.supportEmail ? escapeHtml(branding.supportEmail) : null;
  const safeSignature = escapeHtml(signature);

  const html = `
    <p>Hello,</p>
    <p>This is a friendly reminder that your <strong>${safePlatform}</strong> subscription for <strong>${safeBusiness}</strong> is <strong>${safeUrgency}</strong>.</p>
    <p>Amount due: <strong>${safeAmount}</strong><br/>Payment due date: <strong>${safeDue}</strong></p>
    <p>Please complete payment to avoid service interruption.</p>
    ${safeSupport ? `<p>Contact support: <a href="mailto:${safeSupport}">${safeSupport}</a></p>` : ""}
    <p>${safeSignature}</p>
  `;

  await sendMail({ to: input.to, subject, text, html });
}

export async function sendRenewalReminderEmail(input: {
  to: string;
  businessName: string;
  renewalDate: Date;
  daysUntilRenewal: number;
  branding?: PlatformBranding;
}): Promise<void> {
  if (!isSmtpConfigured()) return;

  const branding = await resolveBranding(input.branding);
  const signature = billingFromName(branding);
  const renewalLabel = formatDate(input.renewalDate);
  const subject = `Renewal reminder — ${input.businessName}`;
  const text = [
    `Hello,`,
    ``,
    `Your ${branding.platformName} subscription for ${input.businessName} renews in ${input.daysUntilRenewal} day(s) (${renewalLabel}).`,
    `An invoice will be sent according to your billing schedule.`,
    ``,
    signature,
  ].join("\n");

  const safePlatform = escapeHtml(branding.platformName);
  const safeBusiness = escapeHtml(input.businessName);
  const safeRenewal = escapeHtml(renewalLabel);
  const safeSignature = escapeHtml(signature);

  const html = `<p>Hello,</p><p>Your <strong>${safePlatform}</strong> subscription for <strong>${safeBusiness}</strong> renews in ${input.daysUntilRenewal} day(s) (${safeRenewal}).</p><p>${safeSignature}</p>`;

  await sendMail({ to: input.to, subject, text, html });
}

export async function sendExpiryWarningEmail(input: {
  to: string;
  businessName: string;
  expiryDate: Date;
  daysUntilExpiry: number;
  branding?: PlatformBranding;
}): Promise<void> {
  if (!isSmtpConfigured()) return;

  const branding = await resolveBranding(input.branding);
  const signature = billingFromName(branding);
  const expiryLabel = formatDate(input.expiryDate);
  const subject = `Service expiry warning — ${input.businessName}`;
  const text = [
    `Hello,`,
    ``,
    `Your ${branding.platformName} data access for ${input.businessName} expires in ${input.daysUntilExpiry} day(s) (${expiryLabel}) unless payment is received.`,
    ``,
    signature,
  ].join("\n");

  const safePlatform = escapeHtml(branding.platformName);
  const safeBusiness = escapeHtml(input.businessName);
  const safeExpiry = escapeHtml(expiryLabel);
  const safeSignature = escapeHtml(signature);

  const html = `<p>Hello,</p><p>Your <strong>${safePlatform}</strong> data access for <strong>${safeBusiness}</strong> expires in ${input.daysUntilExpiry} day(s) (${safeExpiry}) unless payment is received.</p><p>${safeSignature}</p>`;

  await sendMail({ to: input.to, subject, text, html });
}

export async function sendMonthlyReportEmail(input: {
  to: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
}): Promise<void> {
  if (!isSmtpConfigured()) return;

  const html =
    input.bodyHtml ??
    `<pre style="font-family: sans-serif; white-space: pre-wrap;">${escapeHtml(input.bodyText)}</pre>`;

  await sendMail({
    to: input.to,
    subject: input.subject,
    text: input.bodyText,
    html,
  });
}

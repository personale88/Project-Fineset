import { sendMail } from "@/lib/email/send-mail";
import { isSmtpConfigured } from "@/lib/email/env";
import {
  billingFromName,
  getPlatformBranding,
  type PlatformBranding,
} from "@/lib/platform/branding";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";

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
    <p>We have received your payment for <strong>${input.businessName}</strong>.</p>
    ${input.invoiceNumber ? `<p>Invoice: <strong>${input.invoiceNumber}</strong></p>` : ""}
    <p>Paid on: <strong>${paidDate}</strong></p>
    <p>Your portal access is active for the current billing cycle.</p>
    <p>Thank you,<br/>${signature}</p>
    ${branding.supportEmail ? `<p>Support: <a href="mailto:${branding.supportEmail}">${branding.supportEmail}</a></p>` : ""}
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

  const html = `
    <p>Hello,</p>
    <p>This is a friendly reminder that your <strong>${branding.platformName}</strong> subscription for <strong>${input.businessName}</strong> is <strong>${urgency}</strong>.</p>
    <p>Amount due: <strong>${amount}</strong><br/>Payment due date: <strong>${dueLabel}</strong></p>
    <p>Please complete payment to avoid service interruption.</p>
    ${branding.supportEmail ? `<p>Contact support: <a href="mailto:${branding.supportEmail}">${branding.supportEmail}</a></p>` : ""}
    <p>${signature}</p>
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

  const html = `<p>Hello,</p><p>Your <strong>${branding.platformName}</strong> subscription for <strong>${input.businessName}</strong> renews in ${input.daysUntilRenewal} day(s) (${renewalLabel}).</p><p>${signature}</p>`;

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

  const html = `<p>Hello,</p><p>Your <strong>${branding.platformName}</strong> data access for <strong>${input.businessName}</strong> expires in ${input.daysUntilExpiry} day(s) (${expiryLabel}) unless payment is received.</p><p>${signature}</p>`;

  await sendMail({ to: input.to, subject, text, html });
}

export async function sendMonthlyReportEmail(input: {
  to: string;
  subject: string;
  bodyText: string;
}): Promise<void> {
  if (!isSmtpConfigured()) return;

  await sendMail({
    to: input.to,
    subject: input.subject,
    text: input.bodyText,
    html: `<pre style="font-family: sans-serif; white-space: pre-wrap;">${input.bodyText}</pre>`,
  });
}

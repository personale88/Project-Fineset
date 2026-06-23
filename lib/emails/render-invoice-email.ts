import { readFileSync } from "node:fs";
import { join } from "node:path";
import { brandingFromDefaults } from "@/lib/platform/branding";
import { formatCurrency } from "@/lib/utils/formatters";
import type { BusinessMonthlyBilling } from "@/lib/utils/store-billing-pricing";

const TEMPLATE_PATH = join(process.cwd(), "emails/invoice.html");

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface InvoiceEmailContent {
  invoiceNumber: string;
  invoiceDate: string;
  businessName: string;
  ownerName: string;
  businessEmail: string;
  renewalDue: string;
  dataExpiry: string;
  paymentStatus: string;
  siteUrl: string;
  billing: BusinessMonthlyBilling;
  platformName?: string;
  supportEmail?: string;
}

export function buildInvoiceNumber(businessKey: string, reference = new Date()): string {
  const y = reference.getFullYear();
  const m = String(reference.getMonth() + 1).padStart(2, "0");
  const d = String(reference.getDate()).padStart(2, "0");
  const slug = businessKey.replace(/[^a-z0-9]/gi, "").slice(0, 8).toUpperCase() || "BUSINESS";
  return `INV-${y}${m}${d}-${slug}`;
}

function renderLineItemsHtml(billing: BusinessMonthlyBilling): string {
  return billing.stores
    .map(
      (store) => `<tr>
  <td>${escapeHtml(store.storeName)}<br /><span style="color:#888;font-size:12px;">${store.staffCount} staff</span></td>
  <td>${escapeHtml(store.tierLabel)}</td>
  <td class="amount">${formatCurrency(store.baseAmount)}</td>
  <td class="amount">${formatCurrency(store.gstAmount)}</td>
  <td class="amount">${formatCurrency(store.totalAmount)}</td>
</tr>`,
    )
    .join("\n");
}

function renderLineItemsText(billing: BusinessMonthlyBilling): string[] {
  return billing.stores.flatMap((store) => [
    `- ${store.storeName}: ${store.staffCount} staff (${store.tierLabel})`,
    `  Excl. GST: ${formatCurrency(store.baseAmount)}/mo · GST: ${formatCurrency(store.gstAmount)} · Total: ${formatCurrency(store.totalAmount)}`,
  ]);
}

export function renderInvoiceEmailHtml(content: InvoiceEmailContent): string {
  const template = readFileSync(TEMPLATE_PATH, "utf8");
  const siteUrl = content.siteUrl.replace(/\/$/, "");
  const branding = brandingFromDefaults();
  const platformName = content.platformName ?? branding.platformName;
  const supportEmail = content.supportEmail ?? branding.supportEmail;
  const { billing } = content;

  return template
    .replaceAll("{{ .InvoiceNumber }}", escapeHtml(content.invoiceNumber))
    .replaceAll("{{ .InvoiceDate }}", escapeHtml(content.invoiceDate))
    .replaceAll("{{ .BusinessName }}", escapeHtml(content.businessName))
    .replaceAll("{{ .OwnerName }}", escapeHtml(content.ownerName))
    .replaceAll("{{ .BusinessEmail }}", escapeHtml(content.businessEmail))
    .replaceAll("{{ .RenewalDue }}", escapeHtml(content.renewalDue))
    .replaceAll("{{ .DataExpiry }}", escapeHtml(content.dataExpiry))
    .replaceAll("{{ .PaymentStatus }}", escapeHtml(content.paymentStatus))
    .replaceAll("{{ .LineItemsHtml }}", renderLineItemsHtml(billing))
    .replaceAll("{{ .Subtotal }}", escapeHtml(formatCurrency(billing.subtotal)))
    .replaceAll("{{ .GstTotal }}", escapeHtml(formatCurrency(billing.gstTotal)))
    .replaceAll("{{ .GrandTotal }}", escapeHtml(formatCurrency(billing.grandTotal)))
    .replaceAll("{{ .PlatformName }}", escapeHtml(platformName))
    .replaceAll("{{ .SupportEmail }}", escapeHtml(supportEmail))
    .replaceAll("{{ .SiteURL }}", escapeHtml(siteUrl));
}

export function renderInvoiceEmailText(content: InvoiceEmailContent): string {
  const branding = brandingFromDefaults();
  const platformName = content.platformName ?? branding.platformName;
  const supportEmail = content.supportEmail ?? branding.supportEmail;
  const { billing } = content;

  return [
    `Invoice ${content.invoiceNumber}`,
    `Date: ${content.invoiceDate}`,
    "",
    `Hello ${content.ownerName},`,
    "",
    `Monthly ${platformName} subscription invoice for ${content.businessName}.`,
    "",
    `Bill to: ${content.businessEmail}`,
    `Renewal due: ${content.renewalDue}`,
    `Data access until: ${content.dataExpiry}`,
    `Account status: ${content.paymentStatus}`,
    "",
    "Line items (per store, per month):",
    ...renderLineItemsText(billing),
    "",
    `Subtotal (excl. GST): ${formatCurrency(billing.subtotal)}`,
    `GST (18%): ${formatCurrency(billing.gstTotal)}`,
    `Total due (incl. GST): ${formatCurrency(billing.grandTotal)}`,
    "",
    `Reply to this email or contact ${supportEmail} to pay or discuss billing.`,
    siteUrlLine(content.siteUrl),
  ].join("\n");
}

function siteUrlLine(siteUrl: string): string {
  return siteUrl.replace(/\/$/, "");
}

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { BusinessOutstandingBilling } from "@/lib/billing/outstanding-billing";
import { brandingFromDefaults } from "@/lib/platform/branding";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
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
  outstandingBilling?: BusinessOutstandingBilling;
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

function formatPeriodRange(periodStart: string, periodEnd: string): string {
  return `${formatDate(periodStart)} – ${formatDate(periodEnd)}`;
}

function renderPeriodSummaryHtml(outstanding: BusinessOutstandingBilling): string {
  if (outstanding.unpaidPeriodCount <= 1) return "";

  return `<table style="width:100%;border-collapse:collapse;margin:16px 0 8px;">
  <thead>
    <tr>
      <th style="text-align:left;font-size:12px;color:#888;padding:8px 4px;">Billing period</th>
      <th style="text-align:left;font-size:12px;color:#888;padding:8px 4px;">Due</th>
      <th style="text-align:right;font-size:12px;color:#888;padding:8px 4px;">Amount</th>
    </tr>
  </thead>
  <tbody>
    ${outstanding.periods
      .map(
        (period) => `<tr>
      <td style="padding:8px 4px;border-bottom:1px solid #eee8dc;">${escapeHtml(formatPeriodRange(period.periodStart, period.periodEnd))}${period.isOverdue ? ' <span style="color:#b45309;">(overdue)</span>' : ""}</td>
      <td style="padding:8px 4px;border-bottom:1px solid #eee8dc;">${escapeHtml(formatDate(period.dueDate))}</td>
      <td style="padding:8px 4px;border-bottom:1px solid #eee8dc;text-align:right;">${escapeHtml(formatCurrency(period.billing.grandTotal))}</td>
    </tr>`,
      )
      .join("\n")}
  </tbody>
</table>`;
}

function renderLineItemsHtml(
  billing: BusinessMonthlyBilling,
  outstanding?: BusinessOutstandingBilling,
): string {
  if (outstanding && outstanding.unpaidPeriodCount > 1) {
    return outstanding.periods
      .flatMap((period) => {
        const header = `<tr>
  <td colspan="5" style="padding:14px 8px 6px;font-weight:600;background:#faf8f4;border-bottom:1px solid #eee8dc;">${escapeHtml(formatPeriodRange(period.periodStart, period.periodEnd))}</td>
</tr>`;
        const rows = period.billing.stores.map(
          (store) => `<tr>
  <td>${escapeHtml(store.storeName)}<br /><span style="color:#888;font-size:12px;">${store.staffCount} staff</span></td>
  <td>${escapeHtml(store.tierLabel)}</td>
  <td class="amount">${formatCurrency(store.baseAmount)}</td>
  <td class="amount">${formatCurrency(store.gstAmount)}</td>
  <td class="amount">${formatCurrency(store.totalAmount)}</td>
</tr>`,
        );
        return [header, ...rows];
      })
      .join("\n");
  }

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

function renderLineItemsText(
  billing: BusinessMonthlyBilling,
  outstanding?: BusinessOutstandingBilling,
): string[] {
  if (outstanding && outstanding.unpaidPeriodCount > 1) {
    return outstanding.periods.flatMap((period) => [
      `${formatPeriodRange(period.periodStart, period.periodEnd)} — ${formatCurrency(period.billing.grandTotal)}`,
      ...period.billing.stores.flatMap((store) => [
        `  - ${store.storeName}: ${store.staffCount} staff (${store.tierLabel})`,
        `    Excl. GST: ${formatCurrency(store.baseAmount)} · GST: ${formatCurrency(store.gstAmount)} · Total: ${formatCurrency(store.totalAmount)}`,
      ]),
    ]);
  }

  return billing.stores.flatMap((store) => [
    `- ${store.storeName}: ${store.staffCount} staff (${store.tierLabel})`,
    `  Excl. GST: ${formatCurrency(store.baseAmount)}/mo · GST: ${formatCurrency(store.gstAmount)} · Total: ${formatCurrency(store.totalAmount)}`,
  ]);
}

function invoiceIntroHtml(content: InvoiceEmailContent): string {
  const outstanding = content.outstandingBilling;
  if (outstanding && outstanding.unpaidPeriodCount > 1) {
    return `<p>
          Please find your consolidated ${escapeHtml(content.platformName ?? "FineSet")} subscription invoice for
          <strong>${escapeHtml(content.businessName)}</strong>, covering
          <strong>${outstanding.unpaidPeriodCount} unpaid billing periods</strong>.
        </p>`;
  }
  return `<p>
          Please find your monthly ${escapeHtml(content.platformName ?? "FineSet")} subscription invoice for
          <strong>${escapeHtml(content.businessName)}</strong>.
        </p>`;
}

function totalDueLabel(outstanding?: BusinessOutstandingBilling): string {
  if (outstanding && outstanding.unpaidPeriodCount > 1) {
    return "Total outstanding (incl. GST)";
  }
  return "Total due (monthly, incl. GST)";
}

export function renderInvoiceEmailHtml(content: InvoiceEmailContent): string {
  const template = readFileSync(TEMPLATE_PATH, "utf8");
  const siteUrl = content.siteUrl.replace(/\/$/, "");
  const branding = brandingFromDefaults();
  const platformName = content.platformName ?? branding.platformName;
  const supportEmail = content.supportEmail ?? branding.supportEmail;
  const { billing, outstandingBilling } = content;

  return template
    .replaceAll("{{ .InvoiceNumber }}", escapeHtml(content.invoiceNumber))
    .replaceAll("{{ .InvoiceDate }}", escapeHtml(content.invoiceDate))
    .replaceAll("{{ .BusinessName }}", escapeHtml(content.businessName))
    .replaceAll("{{ .OwnerName }}", escapeHtml(content.ownerName))
    .replaceAll("{{ .BusinessEmail }}", escapeHtml(content.businessEmail))
    .replaceAll("{{ .RenewalDue }}", escapeHtml(content.renewalDue))
    .replaceAll("{{ .DataExpiry }}", escapeHtml(content.dataExpiry))
    .replaceAll("{{ .PaymentStatus }}", escapeHtml(content.paymentStatus))
    .replaceAll("{{ .PeriodSummaryHtml }}", outstandingBilling ? renderPeriodSummaryHtml(outstandingBilling) : "")
    .replaceAll("{{ .InvoiceIntroHtml }}", invoiceIntroHtml({ ...content, platformName }))
    .replaceAll("{{ .LineItemsHtml }}", renderLineItemsHtml(billing, outstandingBilling))
    .replaceAll("{{ .Subtotal }}", escapeHtml(formatCurrency(billing.subtotal)))
    .replaceAll("{{ .GstTotal }}", escapeHtml(formatCurrency(billing.gstTotal)))
    .replaceAll("{{ .GrandTotal }}", escapeHtml(formatCurrency(billing.grandTotal)))
    .replaceAll("{{ .TotalDueLabel }}", escapeHtml(totalDueLabel(outstandingBilling)))
    .replaceAll("{{ .PlatformName }}", escapeHtml(platformName))
    .replaceAll("{{ .SupportEmail }}", escapeHtml(supportEmail))
    .replaceAll("{{ .SiteURL }}", escapeHtml(siteUrl));
}

export function renderInvoiceEmailText(content: InvoiceEmailContent): string {
  const branding = brandingFromDefaults();
  const platformName = content.platformName ?? branding.platformName;
  const supportEmail = content.supportEmail ?? branding.supportEmail;
  const { billing, outstandingBilling } = content;

  const intro =
    outstandingBilling && outstandingBilling.unpaidPeriodCount > 1
      ? `Consolidated subscription invoice covering ${outstandingBilling.unpaidPeriodCount} unpaid billing periods for ${content.businessName}.`
      : `Monthly ${platformName} subscription invoice for ${content.businessName}.`;

  return [
    `Invoice ${content.invoiceNumber}`,
    `Date: ${content.invoiceDate}`,
    "",
    `Hello ${content.ownerName},`,
    "",
    intro,
    "",
    `Bill to: ${content.businessEmail}`,
    `Renewal due: ${content.renewalDue}`,
    `Data access until: ${content.dataExpiry}`,
    `Account status: ${content.paymentStatus}`,
    "",
    outstandingBilling && outstandingBilling.unpaidPeriodCount > 1
      ? "Outstanding periods:"
      : "Line items (per store, per month):",
    ...renderLineItemsText(billing, outstandingBilling),
    "",
    `Subtotal (excl. GST): ${formatCurrency(billing.subtotal)}`,
    `GST (18%): ${formatCurrency(billing.gstTotal)}`,
    `${totalDueLabel(outstandingBilling)}: ${formatCurrency(billing.grandTotal)}`,
    "",
    `Reply to this email or contact ${supportEmail} to pay or discuss billing.`,
    siteUrlLine(content.siteUrl),
  ].join("\n");
}

function siteUrlLine(siteUrl: string): string {
  return siteUrl.replace(/\/$/, "");
}

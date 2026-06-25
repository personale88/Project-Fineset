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
  /** When false, omits the email footer (portal invoice preview). Defaults to true. */
  showContactFooter?: boolean;
}

export function formatInvoiceDatePart(reference: Date): string {
  const day = String(reference.getDate()).padStart(2, "0");
  const month = String(reference.getMonth() + 1).padStart(2, "0");
  const year = String(reference.getFullYear());
  return `${day}${month}${year}`;
}

export function invoiceNumberPrefix(reference: Date): string {
  return `INV${formatInvoiceDatePart(reference)}`;
}

/** Five-digit suffix for daily invoice series (10000–99999). */
export function randomInvoiceSuffix(): number {
  return 10_000 + Math.floor(Math.random() * 90_000);
}

/** Invoice id: INV + DDMMYYYY + numeric suffix (e.g. INV2407202648291). */
export function formatInvoiceNumber(reference: Date, suffix: number): string {
  const normalized = Math.min(Math.max(1, Math.floor(suffix)), 999_999);
  return `${invoiceNumberPrefix(reference)}${normalized}`;
}

/** Pay-now / preview reference before an invoice is logged. */
export function generateProvisionalInvoiceRef(reference = new Date()): string {
  return formatInvoiceNumber(reference, randomInvoiceSuffix());
}

function formatPeriodRange(periodStart: string, periodEnd: string): string {
  return `${formatDate(periodStart)} – ${formatDate(periodEnd)}`;
}

const BRAND = {
  gold: "#b8972e",
  goldDark: "#8b6914",
  goldLight: "#d4af37",
  ink: "#5c5348",
  inkSoft: "#6b6358",
  cream: "#f5efe6",
  ivory: "#faf7f2",
  border: "#ebe3d6",
  muted: "#a39e96",
  warning: "#c4842f",
} as const;

function renderPeriodSummaryHtml(outstanding: BusinessOutstandingBilling): string {
  if (outstanding.unpaidPeriodCount <= 1) return "";

  return `<div style="margin:0 0 20px;padding:16px 18px;background:${BRAND.ivory};border:1px solid ${BRAND.border};border-radius:12px;">
  <p style="margin:0 0 12px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${BRAND.goldDark};">Outstanding periods</p>
  <table style="width:100%;border-collapse:collapse;">
  <thead>
    <tr>
      <th style="text-align:left;font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${BRAND.gold};padding:8px 4px;border-bottom:1px solid ${BRAND.border};">Billing period</th>
      <th style="text-align:left;font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${BRAND.gold};padding:8px 4px;border-bottom:1px solid ${BRAND.border};">Due</th>
      <th style="text-align:right;font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${BRAND.gold};padding:8px 4px;border-bottom:1px solid ${BRAND.border};">Amount</th>
    </tr>
  </thead>
  <tbody>
    ${outstanding.periods
      .map(
        (period) => `<tr>
      <td style="padding:10px 4px;border-bottom:1px solid ${BRAND.border};font-size:13px;color:${BRAND.inkSoft};">${escapeHtml(formatPeriodRange(period.periodStart, period.periodEnd))}${period.isOverdue ? ` <span style="color:${BRAND.warning};font-weight:600;">(overdue)</span>` : ""}</td>
      <td style="padding:10px 4px;border-bottom:1px solid ${BRAND.border};font-size:13px;color:${BRAND.inkSoft};">${escapeHtml(formatDate(period.dueDate))}</td>
      <td style="padding:10px 4px;border-bottom:1px solid ${BRAND.border};text-align:right;font-size:13px;font-weight:600;color:${BRAND.goldDark};">${escapeHtml(formatCurrency(period.billing.grandTotal))}</td>
    </tr>`,
      )
      .join("\n")}
  </tbody>
</table>
</div>`;
}

function renderLineItemsHtml(
  billing: BusinessMonthlyBilling,
  outstanding?: BusinessOutstandingBilling,
): string {
  if (outstanding && outstanding.unpaidPeriodCount > 1) {
    return outstanding.periods
      .flatMap((period) => {
        const header = `<tr class="period-header">
  <td colspan="5">${escapeHtml(formatPeriodRange(period.periodStart, period.periodEnd))}</td>
</tr>`;
        const rows = period.billing.stores.map(
          (store) => `<tr>
  <td>${escapeHtml(store.storeName)}<span class="store-sub">${store.staffCount} staff</span></td>
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
  <td>${escapeHtml(store.storeName)}<span class="store-sub">${store.staffCount} staff</span></td>
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

function renderContactFooterHtml(
  platformName: string,
  supportEmail: string,
  siteUrl: string,
  showContactFooter: boolean,
): string {
  if (!showContactFooter) return "";

  return `<div class="footer">
        Sent by <strong>${escapeHtml(platformName)}</strong><br />
        <a href="mailto:${escapeHtml(supportEmail)}">${escapeHtml(supportEmail)}</a>
        · <a href="${escapeHtml(siteUrl)}">${escapeHtml(siteUrl)}</a>
      </div>`;
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
    .replaceAll("{{ .SiteURL }}", escapeHtml(siteUrl))
    .replaceAll(
      "{{ .ContactFooterHtml }}",
      renderContactFooterHtml(
        platformName,
        supportEmail,
        siteUrl,
        content.showContactFooter !== false,
      ),
    );
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

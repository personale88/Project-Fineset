"use client";

import { useMemo, useState } from "react";
import {
  CalendarClock,
  CalendarX2,
  CheckCircle2,
  ChevronDown,
  Mail,
  MessageSquarePlus,
  Store,
  Users,
} from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { useBillingCycleSettings } from "@/components/admin/BillingCycleSettingsProvider";
import { useBillingPricingConfig } from "@/components/admin/PlatformSettingsProvider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getBusinessPaymentStatus,
  type AdminPortfolioPaymentStatus,
} from "@/lib/utils/admin-portfolio-filters";
import { shouldShowBillingReminderActions } from "@/lib/utils/billing-reminder-eligibility";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import { calculateBusinessMonthlyBilling } from "@/lib/utils/store-billing-pricing";
import type { BillingAccountSummaryDto } from "@/lib/api/billing";
import type { Content } from "@/content/en";
import type { BusinessPortfolioRow } from "@/types";

type AdminContent = Content["admin"];
type BillingCopy = AdminContent["billing"];

function PaymentStatusBadge({
  status,
  labels,
}: {
  status: AdminPortfolioPaymentStatus;
  labels: Record<AdminPortfolioPaymentStatus, string>;
}) {
  const styles: Record<AdminPortfolioPaymentStatus, string> = {
    CURRENT: "bg-status-success/10 text-status-success ring-status-success/20",
    DUE_SOON: "bg-status-warning/10 text-status-warning ring-status-warning/20",
    OVERDUE: "bg-status-error/10 text-status-error ring-status-error/20",
    EXPIRED: "bg-status-error/10 text-status-error ring-status-error/20",
    UNKNOWN: "bg-surface-secondary text-text-muted ring-border",
  };

  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        styles[status],
      )}
    >
      {labels[status]}
    </span>
  );
}

function MetaItem({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: typeof CalendarClock;
  label: string;
  value: string;
  tone?: "default" | "warning" | "error";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-sm",
        tone === "warning" && "text-status-warning",
        tone === "error" && "text-status-error",
        tone === "default" && "text-text-secondary",
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
      {label ? <span className="text-text-muted">{label}</span> : null}
      <span className="font-medium text-text-primary">{value}</span>
    </span>
  );
}

interface BillingBusinessCardProps {
  business: BusinessPortfolioRow;
  billing: BillingCopy;
  statusLabels: Record<AdminPortfolioPaymentStatus, string>;
  summary?: BillingAccountSummaryDto;
  invoiceSent: boolean;
  isSendingInvoice: boolean;
  isSendingWhatsApp: boolean;
  canManage?: boolean;
  onSendInvoice: (businessKey: string) => void;
  onSendWhatsAppReminder: (businessKey: string) => void;
  onFollowUp: (business: BusinessPortfolioRow) => void;
}

export function BillingBusinessCard({
  business,
  billing,
  statusLabels,
  summary,
  invoiceSent,
  isSendingInvoice,
  isSendingWhatsApp,
  canManage = true,
  onSendInvoice,
  onSendWhatsAppReminder,
  onFollowUp,
}: BillingBusinessCardProps) {
  const cycleSettings = useBillingCycleSettings();
  const billingPricing = useBillingPricingConfig();
  const followUp = billing.followUp;
  const status = getBusinessPaymentStatus(
    business,
    new Date(),
    undefined,
    undefined,
    cycleSettings,
  );
  const hasEmail = Boolean(business.businessEmail?.trim());
  const hasPhone = Boolean(business.businessPhone?.trim());
  const isBillingPaid = summary?.paymentStatus === "PAID";
  const needsReminder = shouldShowBillingReminderActions(
    status,
    summary?.paymentStatus,
  );
  const showFollowUp = needsReminder || (summary?.followUpCount ?? 0) > 0;
  const showWhatsApp = needsReminder;
  const [breakdownOpen, setBreakdownOpen] = useState(business.storeCount <= 2);

  const monthlyBilling = useMemo(
    () => calculateBusinessMonthlyBilling(business.stores, billingPricing),
    [business.stores, billingPricing],
  );
  const totalEmployees = useMemo(
    () => business.stores.reduce((sum, store) => sum + store.staffCount, 0),
    [business.stores],
  );

  const expiryTone = status === "EXPIRED" ? "error" : "default";
  const renewalTone =
    status === "OVERDUE" ? "error" : status === "DUE_SOON" ? "warning" : "default";

  return (
    <article className="overflow-hidden rounded-card border border-border bg-surface-card shadow-card">
      {/* Header */}
      <div className="border-b border-border px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate font-display text-lg font-semibold text-text-primary">
                {business.businessName}
              </h2>
              <PaymentStatusBadge status={status} labels={statusLabels} />
            </div>
            {(business.ownerName || business.businessEmail) && (
              <p className="truncate text-sm text-text-secondary">
                {[business.ownerName, business.businessEmail].filter(Boolean).join(" · ")}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <MetaItem
                icon={Store}
                label=""
                value={`${business.storeCount} ${business.storeCount === 1 ? "store" : "stores"}`}
              />
              <MetaItem
                icon={Users}
                label=""
                value={`${totalEmployees} staff`}
              />
              {business.renewalDueAt ? (
                <MetaItem
                  icon={CalendarClock}
                  label={billing.columns.renewalDue}
                  value={formatDate(business.renewalDueAt)}
                  tone={renewalTone}
                />
              ) : null}
              {business.dataExpiryAt ? (
                <MetaItem
                  icon={CalendarX2}
                  label={billing.columns.dataExpiry}
                  value={formatDate(business.dataExpiryAt)}
                  tone={expiryTone}
                />
              ) : null}
            </div>
          </div>

          <div className="shrink-0 text-left sm:text-right">
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
              {billing.totalInclGst}
            </p>
            <p className="mt-0.5 font-numeric text-2xl font-bold tabular-nums text-text-primary">
              {formatCurrency(monthlyBilling.grandTotal)}
            </p>
            <p className="mt-0.5 text-xs text-text-muted">
              {formatCurrency(monthlyBilling.subtotal)} + {formatCurrency(monthlyBilling.gstTotal)} GST
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      {canManage ? (
      <div className="flex flex-col gap-3 border-b border-border bg-surface-secondary/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          {showFollowUp ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onFollowUp(business)}
            >
              <MessageSquarePlus className="mr-1.5 h-4 w-4" aria-hidden />
              {isBillingPaid ? followUp.timeline : followUp.button}
            </Button>
          ) : null}
          {showWhatsApp ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-[#25D366]/40 text-[#128C7E] hover:bg-[#25D366]/10"
              disabled={!hasPhone || isSendingWhatsApp}
              title={hasPhone ? undefined : billing.whatsAppReminderNoPhone}
              onClick={() => onSendWhatsAppReminder(business.businessKey)}
            >
              <WhatsAppIcon className="mr-1.5" />
              <span className="hidden sm:inline">
                {billing.sendWhatsAppReminder ?? "Send WhatsApp reminder"}
              </span>
              <span className="sm:hidden">
                {billing.sendWhatsAppReminderShort ?? "WhatsApp"}
              </span>
            </Button>
          ) : null}
          {invoiceSent ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-full bg-status-success/10 px-3 py-1.5 text-sm font-medium text-status-success"
              role="status"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
              {billing.invoiceSent}
            </span>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!hasEmail || isSendingInvoice}
              title={hasEmail ? undefined : billing.invoiceNoEmail}
              onClick={() => onSendInvoice(business.businessKey)}
            >
              <Mail className="mr-1.5 h-4 w-4" aria-hidden />
              {isSendingInvoice ? billing.sendingInvoice : billing.sendInvoice}
            </Button>
          )}
        </div>

        {(summary?.followUpCount ?? 0) > 0 || summary?.nextFollowUpAt ? (
          <div className="text-xs text-text-muted sm:text-right">
            {(summary?.followUpCount ?? 0) > 0 ? (
              <span>
                {followUp.followUpCount.replace(
                  "{count}",
                  String(summary!.followUpCount),
                )}
                {summary?.lastFollowUpAt
                  ? ` · ${followUp.lastFollowUp.replace(
                      "{date}",
                      formatDate(summary.lastFollowUpAt),
                    )}`
                  : ""}
              </span>
            ) : null}
            {summary?.nextFollowUpAt ? (
              <p className="mt-0.5 font-medium text-status-warning">
                {followUp.nextDue.replace(
                  "{date}",
                  formatDate(summary.nextFollowUpAt),
                )}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
      ) : invoiceSent ? (
        <div className="border-b border-border bg-surface-secondary/20 px-4 py-3 sm:px-5">
          <span
            className="inline-flex items-center gap-1.5 rounded-full bg-status-success/10 px-3 py-1.5 text-sm font-medium text-status-success"
            role="status"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
            {billing.invoiceSent}
          </span>
        </div>
      ) : null}

      {/* Store breakdown */}
      {business.storeCount > 1 ? (
        <div className="border-b border-border">
          <button
            type="button"
            aria-expanded={breakdownOpen}
            onClick={() => setBreakdownOpen((open) => !open)}
            className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-text-primary transition-colors hover:bg-surface-secondary/30 sm:px-5"
          >
            <span>{billing.storeBreakdown}</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-text-muted transition-transform duration-200",
                breakdownOpen && "rotate-180",
              )}
              aria-hidden
            />
          </button>
          {breakdownOpen ? (
            <div className="overflow-x-auto px-4 pb-4 sm:px-5">
              <StoreBreakdownTable billing={billing} lines={monthlyBilling.stores} />
            </div>
          ) : null}
        </div>
      ) : (
        <div className="border-b border-border px-4 py-3 sm:px-5">
          {monthlyBilling.stores.map((line) => (
            <div
              key={line.storeId}
              className="flex flex-wrap items-center justify-between gap-2 text-sm"
            >
              <span className="text-text-primary">{line.storeName}</span>
              <span className="text-text-muted">
                {line.staffCount} staff · {line.tierLabel} ·{" "}
                <span className="tabular-nums text-text-primary">
                  {formatCurrency(line.baseAmount)}
                </span>
                <span className="text-text-muted"> excl. GST</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function StoreBreakdownTable({
  billing,
  lines,
}: {
  billing: BillingCopy;
  lines: ReturnType<typeof calculateBusinessMonthlyBilling>["stores"];
}) {
  return (
    <table className="w-full min-w-[320px] text-left text-sm">
      <thead>
        <tr className="border-b border-border text-xs text-text-muted">
          <th className="pb-2 pr-3 font-medium">{billing.columns.stores}</th>
          <th className="pb-2 pr-3 font-medium">{billing.employees}</th>
          <th className="pb-2 pr-3 font-medium">{billing.plan}</th>
          <th className="pb-2 text-right font-medium">{billing.perStoreExclGst}</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border/60">
        {lines.map((line) => (
          <tr key={line.storeId}>
            <td className="py-2.5 pr-3 text-text-primary">{line.storeName}</td>
            <td className="py-2.5 pr-3 tabular-nums text-text-primary">{line.staffCount}</td>
            <td className="py-2.5 pr-3 text-text-secondary">{line.tierLabel}</td>
            <td className="py-2.5 text-right tabular-nums text-text-primary">
              {formatCurrency(line.baseAmount)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

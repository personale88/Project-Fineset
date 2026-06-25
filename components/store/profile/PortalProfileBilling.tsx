"use client";

import { useCallback, useState, type ReactNode } from "react";
import {
  AlertCircle,
  CalendarClock,
  ChevronDown,
  CreditCard,
  FileText,
  Store,
  Users,
} from "lucide-react";
import { content } from "@/content/en";
import { useBillingAccessContext } from "@/components/billing/BillingAccessProvider";
import { usePortalBillingDetails } from "@/hooks/usePortalBillingDetails";
import {
  fetchPortalInvoicePreview,
  PortalBillingApiError,
} from "@/lib/api/portal-billing-details";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils/formatters";
import type { ProfileCopy } from "@/components/store/profile/profile-scope";
import type { AdminPortfolioPaymentStatus } from "@/lib/utils/admin-portfolio-filters";
import type { PortalBillingAccessSnapshot } from "@/lib/services/portal-billing-details";
import { PortalPayNowDialog } from "@/components/store/profile/PortalPayNowDialog";

type BillingTab = "current" | "history";

function safeFormatDate(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return formatDate(parsed);
}

function accountPaymentStatusTone(status: string, effectiveUnpaid: boolean): string {
  if (effectiveUnpaid) {
    return "border-status-error/30 bg-status-error/10 text-status-error";
  }
  switch (status) {
    case "PAID":
      return "border-status-success/30 bg-status-success/10 text-status-success";
    case "PARTIAL":
      return "border-status-warning/30 bg-status-warning/10 text-status-warning";
    case "DISPUTED":
      return "border-border bg-surface-secondary text-text-secondary";
    case "UNPAID":
      return "border-status-error/30 bg-status-error/10 text-status-error";
    default:
      return "border-border bg-surface-secondary text-text-secondary";
  }
}

function accountPaymentStatusLabel(
  status: string,
  copy: ProfileCopy["billing"],
  effectiveUnpaid: boolean,
): string | null {
  if (effectiveUnpaid) return copy.statusUnpaid;
  switch (status) {
    case "PAID":
      return copy.statusPaid;
    case "PARTIAL":
      return copy.statusPartial;
    case "DISPUTED":
      return copy.statusDisputed;
    case "UNPAID":
      return copy.statusUnpaid;
    default:
      return null;
  }
}

function portfolioStatusTone(status: AdminPortfolioPaymentStatus): string {
  switch (status) {
    case "CURRENT":
      return "bg-status-success/10 text-status-success ring-status-success/20";
    case "DUE_SOON":
      return "bg-status-warning/10 text-status-warning ring-status-warning/20";
    case "OVERDUE":
    case "EXPIRED":
      return "bg-status-error/10 text-status-error ring-status-error/20";
    default:
      return "bg-surface-secondary text-text-muted ring-border";
  }
}

function resolveDetailsErrorMessage(
  error: unknown,
  copy: ProfileCopy["billing"],
): string {
  if (error instanceof PortalBillingApiError) {
    if (error.status === 403) return copy.loadFailedForbidden;
    if (error.status === 404) return copy.loadFailedNotFound;
    if (error.message) return error.message;
  }
  return copy.loadFailed;
}

function resolveInvoiceErrorMessage(
  error: unknown,
  copy: ProfileCopy["billing"],
): string {
  if (error instanceof PortalBillingApiError) {
    if (error.status === 404) return copy.invoiceNotFound;
    if (error.message) return error.message;
  }
  return copy.invoicePreviewFailed;
}

function BillingNotice({
  tone,
  children,
}: {
  tone: "warning" | "error" | "info";
  children: ReactNode;
}) {
  const styles =
    tone === "error"
      ? "border-status-error/30 bg-status-error/10 text-text-secondary"
      : tone === "warning"
        ? "border-amber-500/30 bg-amber-500/10 text-text-secondary"
        : "border-border bg-surface-secondary/40 text-text-secondary";

  return (
    <p className={cn("rounded-input border px-3 py-2 text-sm", styles)}>{children}</p>
  );
}

function BillingLoadError({
  message,
  retryLabel,
  onRetry,
}: {
  message: string;
  retryLabel: string;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-input border border-status-error/30 bg-status-error/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-status-error" aria-hidden />
        <p className="text-sm text-status-error">{message}</p>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={onRetry} className="shrink-0">
        {retryLabel}
      </Button>
    </div>
  );
}

function BillingDetailCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border/80 bg-gradient-to-b from-surface-secondary/50 to-surface-secondary/20 p-3.5">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-surface-primary/80 text-text-muted">
          {icon}
        </span>
        <p className="text-xs font-medium leading-tight text-text-muted">{label}</p>
      </div>
      <p className="mt-2.5 text-sm font-semibold leading-snug tabular-nums text-text-primary">
        {value}
      </p>
    </div>
  );
}

function resolveBillingAccountHeader(
  details: {
    businessName: string;
    businessEmail: string | null;
    ownerName: string | null;
    storeCount: number;
  },
  copy: ProfileCopy["billing"],
): { title: string; subtitle: string | null; showAccountHint: boolean } {
  if (details.storeCount > 1) {
    return {
      title: details.ownerName?.trim() || copy.multiStoreAccountTitle,
      subtitle: copy.multiStoreSubtitle.replace("{count}", String(details.storeCount)),
      showAccountHint: true,
    };
  }

  return {
    title: details.businessName || copy.businessFallback,
    subtitle: details.businessEmail,
    showAccountHint: false,
  };
}

interface PortalProfileBillingProps {
  copy: ProfileCopy["billing"];
}

export function PortalProfileBilling({ copy }: PortalProfileBillingProps) {
  const adminBilling = content.admin.billing;
  const {
    access: contextAccess,
    isLoading: accessLoading,
    isError: accessError,
    isRestricted: contextRestricted,
    refetch: refetchAccess,
  } = useBillingAccessContext();
  const {
    data: details,
    isLoading: detailsLoading,
    isError: detailsError,
    error: detailsQueryError,
    refetch: refetchDetails,
  } = usePortalBillingDetails();

  const [billingTab, setBillingTab] = useState<BillingTab>("current");
  const [breakdownOpen, setBreakdownOpen] = useState(true);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invoiceHtml, setInvoiceHtml] = useState<string | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState<string | null>(null);
  const [invoiceDisclaimer, setInvoiceDisclaimer] = useState<string | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [activeInvoiceLogId, setActiveInvoiceLogId] = useState<string | undefined>();
  const [payNowOpen, setPayNowOpen] = useState(false);

  const loadInvoicePreview = useCallback(
    async (invoiceLogId?: string) => {
      setInvoiceLoading(true);
      setInvoiceError(null);
      setInvoiceDisclaimer(null);
      try {
        const preview = await fetchPortalInvoicePreview(invoiceLogId);
        setInvoiceHtml(preview.html);
        setInvoiceNumber(preview.invoiceNumber);

        if (
          preview.isHistorical &&
          preview.historicalGrandTotal != null &&
          preview.historicalGrandTotal !== preview.currentGrandTotal
        ) {
          const log = details?.invoiceLogs.find((entry) => entry.id === invoiceLogId);
          setInvoiceDisclaimer(
            copy.invoiceHistoricalDisclaimer
              .replace("{date}", log ? formatDateTime(log.createdAt) : copy.datesNotSet)
              .replace("{amount}", formatCurrency(preview.historicalGrandTotal)),
          );
        }
      } catch (error) {
        setInvoiceError(resolveInvoiceErrorMessage(error, copy));
        setInvoiceHtml(null);
        setInvoiceNumber(null);
      } finally {
        setInvoiceLoading(false);
      }
    },
    [copy, details?.invoiceLogs],
  );

  const handleViewInvoice = useCallback(
    (invoiceLogId?: string) => {
      setActiveInvoiceLogId(invoiceLogId);
      setInvoiceOpen(true);
      void loadInvoicePreview(invoiceLogId);
    },
    [loadInvoicePreview],
  );

  const handleInvoiceOpenChange = useCallback((open: boolean) => {
    setInvoiceOpen(open);
    if (!open) {
      setInvoiceHtml(null);
      setInvoiceNumber(null);
      setInvoiceDisclaimer(null);
      setInvoiceError(null);
      setActiveInvoiceLogId(undefined);
    }
  }, []);

  if (detailsLoading) {
    return <p className="text-sm text-text-muted">{copy.loading}</p>;
  }

  if (detailsError || !details) {
    return (
      <BillingLoadError
        message={resolveDetailsErrorMessage(detailsQueryError, copy)}
        retryLabel={copy.retry}
        onRetry={() => {
          void refetchDetails();
        }}
      />
    );
  }

  const access: PortalBillingAccessSnapshot = details.access;
  const isRestricted = access.billingRestricted ?? contextRestricted;
  const paymentDeadline = contextAccess?.paymentDeadline
    ? safeFormatDate(contextAccess.paymentDeadline, copy.deadlineFallback)
    : safeFormatDate(access.paymentDeadline, access.paymentDeadlineFallback || copy.deadlineFallback);

  const monthlyBilling = details.monthlyBilling;
  const outstandingBilling = details.outstandingBilling;
  const hasOutstanding =
    outstandingBilling.unpaidPeriodCount > 0 && outstandingBilling.grandTotal > 0;
  const effectiveUnpaid = hasOutstanding && details.paymentStatus !== "WAIVED";
  const paymentStatusLabel = effectiveUnpaid
    ? copy.statusUnpaid
    : accountPaymentStatusLabel(details.paymentStatus, copy, false);
  const hasBillableStores = details.storeCount > 0 && monthlyBilling.stores.length > 0;
  const hasCharge = outstandingBilling.grandTotal > 0;
  const outstandingPeriodLabel =
    outstandingBilling.unpaidPeriodCount > 1
      ? copy.outstandingMultiPeriod.replace(
          "{count}",
          String(outstandingBilling.unpaidPeriodCount),
        )
      : copy.outstandingSinglePeriod;
  const accountHeader = resolveBillingAccountHeader(details, copy);

  return (
    <div className="space-y-4">
      {accessError && !accessLoading ? (
        <BillingNotice tone="warning">
          {copy.accessLoadFailed}{" "}
          <button
            type="button"
            className="font-medium text-text-primary underline-offset-2 hover:underline"
            onClick={() => refetchAccess()}
          >
            {copy.retry}
          </button>
        </BillingNotice>
      ) : null}

      <Tabs
        value={billingTab}
        onValueChange={(value) => setBillingTab(value as BillingTab)}
        className="space-y-4"
      >
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 p-1">
          <TabsTrigger value="current" className="px-2 py-2 text-xs sm:text-sm">
            {copy.tabs.currentBilling}
          </TabsTrigger>
          <TabsTrigger value="history" className="px-2 py-2 text-xs sm:text-sm">
            {copy.tabs.invoiceHistory}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="mt-0 space-y-5">
          <p className="text-sm text-text-secondary">{copy.currentBillingHint}</p>

          {access.isGracePeriod ? (
            <BillingNotice tone="info">
              {copy.gracePeriodNotice.replace("{deadline}", paymentDeadline)}
            </BillingNotice>
          ) : null}

          {details.portfolioPaymentStatus === "EXPIRED" ? (
            <BillingNotice tone="error">{copy.expiredNotice}</BillingNotice>
          ) : null}

          {details.paymentStatus === "PARTIAL" ? (
            <BillingNotice tone="warning">{copy.partialPaymentNotice}</BillingNotice>
          ) : null}

          {details.paymentStatus === "DISPUTED" ? (
            <BillingNotice tone="warning">{copy.disputedNotice}</BillingNotice>
          ) : null}

          {isRestricted ? (
            <BillingNotice tone="warning">{copy.restrictedBillingNotice}</BillingNotice>
          ) : null}

          {!details.businessEmail ? (
            <BillingNotice tone="warning">{copy.noBusinessEmail}</BillingNotice>
          ) : null}

          {!hasBillableStores ? (
            <BillingNotice tone="info">{copy.noBillableStores}</BillingNotice>
          ) : null}

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-2">
              <p className="text-sm font-medium text-text-primary">{accountHeader.title}</p>
              {accountHeader.subtitle ? (
                <p className="text-xs text-text-muted">{accountHeader.subtitle}</p>
              ) : null}
              {details.businessEmail && details.storeCount > 1 ? (
                <p className="text-xs text-text-muted">{details.businessEmail}</p>
              ) : null}
              {accountHeader.showAccountHint ? (
                <p className="text-xs text-text-secondary">{copy.accountHint}</p>
              ) : null}
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
                    portfolioStatusTone(details.portfolioPaymentStatus),
                  )}
                >
                  {details.portfolioPaymentStatusLabel || copy.statusUnknown}
                </span>
                {paymentStatusLabel ? (
                  <span
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                      accountPaymentStatusTone(details.paymentStatus, effectiveUnpaid),
                    )}
                  >
                    {paymentStatusLabel}
                  </span>
                ) : details.paymentStatus !== "WAIVED" ? (
                  <span className="rounded-full border border-border bg-surface-secondary px-2.5 py-0.5 text-xs font-semibold text-text-secondary">
                    {copy.statusUnknown}
                  </span>
                ) : null}
                {access.isGracePeriod ? (
                  <span className="rounded-full border border-status-warning/30 bg-status-warning/10 px-2.5 py-0.5 text-xs font-semibold text-status-warning">
                    {copy.statusGrace}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="shrink-0 text-left sm:text-right">
              <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                {copy.outstandingTitle}
              </p>
              <p className="mt-0.5 text-xs text-text-muted">{outstandingPeriodLabel}</p>
              <p className="mt-1 font-numeric text-2xl font-bold tabular-nums text-text-primary">
                {formatCurrency(outstandingBilling.grandTotal)}
              </p>
              {hasCharge ? (
                <p className="mt-0.5 text-xs text-text-muted">
                  {formatCurrency(outstandingBilling.subtotal)} +{" "}
                  {formatCurrency(outstandingBilling.gstTotal)} GST ({details.gstRatePercent}%)
                </p>
              ) : (
                <p className="mt-0.5 text-xs text-text-muted">{copy.zeroCharge}</p>
              )}
            </div>
          </div>

          {outstandingBilling.unpaidPeriodCount > 1 ? (
            <div className="space-y-2 rounded-input border border-border bg-surface-secondary/20 px-3 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                {copy.outstandingPeriodLabel}
              </p>
              <ul className="space-y-2">
                {outstandingBilling.periods.map((period) => (
                  <li
                    key={period.periodStart}
                    className="flex flex-wrap items-center justify-between gap-2 text-sm"
                  >
                    <div>
                      <p className="font-medium text-text-primary">
                        {safeFormatDate(period.periodStart, copy.datesNotSet)} –{" "}
                        {safeFormatDate(period.periodEnd, copy.datesNotSet)}
                      </p>
                      <p className="text-xs text-text-muted">
                        {period.isOverdue ? copy.outstandingPeriodOverdue : copy.outstandingPeriodCurrent}
                        {" · "}
                        {copy.outstandingPeriodDue.replace(
                          "{date}",
                          safeFormatDate(period.dueDate, copy.datesNotSet),
                        )}
                      </p>
                    </div>
                    <p className="font-numeric tabular-nums text-text-primary">
                      {formatCurrency(period.billing.grandTotal)}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <BillingDetailCard
              icon={<FileText className="h-4 w-4" aria-hidden />}
              label={copy.invoiceDateLabel}
              value={safeFormatDate(details.invoiceDate, copy.datesNotSet)}
            />
            <BillingDetailCard
              icon={<CalendarClock className="h-4 w-4" aria-hidden />}
              label={copy.dueDateLabel}
              value={safeFormatDate(details.renewalDueAt, copy.datesNotSet)}
            />
          </div>

          {hasBillableStores ? (
            <>
              <div className="flex flex-wrap items-center gap-2 text-sm text-text-secondary">
                <span className="inline-flex items-center gap-1.5">
                  <Store className="h-3.5 w-3.5" aria-hidden />
                  {adminBilling.totalsSummary
                    .replace("{stores}", String(details.storeCount))
                    .replace("{employees}", String(details.totalStaff))}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" aria-hidden />
                  {details.totalStaff} staff
                </span>
              </div>

              {details.storeCount > 1 ? (
                <div className="overflow-hidden rounded-input border border-border">
                  <button
                    type="button"
                    aria-expanded={breakdownOpen}
                    onClick={() => setBreakdownOpen((open) => !open)}
                    className="flex w-full items-center justify-between px-3 py-3 text-left text-sm font-medium text-text-primary transition-colors hover:bg-surface-secondary/30"
                  >
                    <span>{adminBilling.storeBreakdown}</span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-text-muted transition-transform duration-200",
                        breakdownOpen && "rotate-180",
                      )}
                      aria-hidden
                    />
                  </button>
                  {breakdownOpen ? (
                    <div className="overflow-x-auto border-t border-border px-3 pb-3">
                      <table className="w-full min-w-[320px] text-left text-sm">
                        <thead>
                          <tr className="border-b border-border text-xs text-text-muted">
                            <th className="py-2 pr-3 font-medium">{adminBilling.columns.stores}</th>
                            <th className="py-2 pr-3 font-medium">{adminBilling.employees}</th>
                            <th className="py-2 pr-3 font-medium">{adminBilling.plan}</th>
                            <th className="py-2 text-right font-medium">
                              {adminBilling.perStoreExclGst}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {monthlyBilling.stores.map((line) => (
                            <tr key={line.storeId}>
                              <td className="py-2.5 pr-3 text-text-primary">{line.storeName}</td>
                              <td className="py-2.5 pr-3 tabular-nums">{line.staffCount}</td>
                              <td className="py-2.5 pr-3 text-text-secondary">{line.tierLabel}</td>
                              <td className="py-2.5 text-right tabular-nums">
                                {formatCurrency(line.baseAmount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-input border border-border px-3 py-3">
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
            </>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <p className="text-sm text-text-muted">{copy.renewHint}</p>
            <div className="flex flex-wrap items-center gap-2">
              {details.payNow.available ? (
                <Button
                  type="button"
                  size="sm"
                  className="gap-2"
                  onClick={() => setPayNowOpen(true)}
                >
                  <CreditCard className="h-4 w-4" aria-hidden />
                  {copy.payNow}
                </Button>
              ) : details.payNow.unavailableReason === "ALREADY_PAID" ? (
                <Button type="button" size="sm" variant="secondary" disabled className="gap-2">
                  <CreditCard className="h-4 w-4" aria-hidden />
                  {copy.payNowUnavailablePaid}
                </Button>
              ) : details.payNow.unavailableReason === "NO_UPI" &&
                details.payNow.amountInr > 0 ? (
                <Button type="button" size="sm" variant="outline" disabled className="gap-2">
                  <CreditCard className="h-4 w-4" aria-hidden />
                  {copy.payNowUnavailableNoContact}
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-2"
                disabled={!hasBillableStores}
                onClick={() => handleViewInvoice()}
              >
                <FileText className="h-4 w-4" aria-hidden />
                {copy.viewInvoice}
              </Button>
            </div>
          </div>
          {details.payNow.available ? (
            <p className="text-xs text-text-muted">{copy.payNowHint}</p>
          ) : null}
        </TabsContent>

        <TabsContent value="history" className="mt-0 space-y-4">
          <p className="text-sm text-text-secondary">{copy.invoiceHistoryHint}</p>

          {details.invoiceLogs.length === 0 ? (
            <div className="rounded-input border border-border bg-surface-secondary/20 px-4 py-8 text-center">
              <p className="text-sm text-text-muted">{copy.noInvoices}</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {details.invoiceLogs.map((log) => (
                <li
                  key={log.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-input border border-border bg-surface-secondary/20 px-3 py-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-text-primary">{log.invoiceNumber}</p>
                    <p className="text-xs text-text-muted">
                      {adminBilling.followUp.invoiceSentTo
                        .replace("{email}", log.sentTo || "—")
                        .replace("{date}", formatDateTime(log.createdAt))}
                      {log.unpaidPeriodCount && log.unpaidPeriodCount > 1
                        ? ` · ${copy.invoiceConsolidatedPeriods.replace("{count}", String(log.unpaidPeriodCount))}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-numeric tabular-nums text-text-primary">
                      {formatCurrency(log.grandTotal)}
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="gap-1.5"
                      onClick={() => handleViewInvoice(log.id)}
                    >
                      <FileText className="h-3.5 w-3.5" aria-hidden />
                      {copy.viewInvoice}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={invoiceOpen} onOpenChange={handleInvoiceOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-hidden p-0">
          <DialogHeader className="border-b border-border px-4 py-3 sm:px-5">
            <DialogTitle>
              {invoiceNumber ? `${copy.viewInvoice} — ${invoiceNumber}` : copy.viewInvoice}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[calc(90vh-4rem)] overflow-y-auto bg-brand-ivory p-4 sm:p-6">
            {invoiceLoading ? (
              <p className="text-sm text-text-secondary">{copy.invoicePreviewLoading}</p>
            ) : invoiceError ? (
              <div className="space-y-3">
                <p className="text-sm text-status-error">{invoiceError}</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void loadInvoicePreview(activeInvoiceLogId)}
                >
                  {copy.retry}
                </Button>
              </div>
            ) : invoiceHtml ? (
              <div className="space-y-3">
                {invoiceDisclaimer ? (
                  <p className="rounded-input border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-text-secondary">
                    {invoiceDisclaimer}
                  </p>
                ) : null}
                <div
                  className="mx-auto max-w-[600px] overflow-hidden rounded-2xl shadow-lg"
                  dangerouslySetInnerHTML={{ __html: invoiceHtml }}
                />
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {details ? (
        <PortalPayNowDialog
          open={payNowOpen}
          onOpenChange={setPayNowOpen}
          copy={copy}
          payNow={details.payNow}
        />
      ) : null}
    </div>
  );
}

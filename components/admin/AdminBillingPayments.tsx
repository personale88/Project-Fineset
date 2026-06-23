"use client";

import { useMemo, useState, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Search,
} from "lucide-react";
import { useAdminDashboardOverview } from "@/hooks/useAnalytics";
import { useBillingSummaries } from "@/hooks/useBillingFollowUps";
import { sendBusinessInvoice, sendBillingWhatsAppReminder } from "@/lib/api/billing";
import type { BillingAccountSummaryDto } from "@/lib/api/billing";
import { AdminPageIntro } from "@/components/admin/AdminPageIntro";
import { AdminLoadErrorBanner } from "@/components/admin/AdminLoadErrorBanner";
import { BillingFollowUpPane } from "@/components/admin/billing/BillingFollowUpPane";
import { BillingBusinessCard } from "@/components/admin/billing/BillingBusinessCard";
import {
  BillingStatusSummary,
  type BillingPaymentFilter,
} from "@/components/admin/billing/BillingStatusSummary";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/useToast";
import { ApiError } from "@/types";
import { useBillingCycleSettings } from "@/components/admin/BillingCycleSettingsProvider";
import { useBillingPricingConfig } from "@/components/admin/PlatformSettingsProvider";
import { formatPricingTiersSummary } from "@/lib/utils/store-billing-pricing";
import { getBillingPaymentStatusCopy } from "@/lib/utils/billing-status-labels";
import {
  countBusinessesByPaymentStatus,
  getBusinessPaymentStatus,
  type AdminPortfolioPaymentStatus,
} from "@/lib/utils/admin-portfolio-filters";
import type { Content } from "@/content/en";
import type { AdminDashboardOverview, BusinessPortfolioRow } from "@/types";

type AdminContent = Content["admin"];

type PaymentFilter = BillingPaymentFilter;

interface AdminBillingPaymentsProps {
  admin: AdminContent;
  initialOverview?: AdminDashboardOverview;
  initialOverviewFailed?: boolean;
}

export function AdminBillingPayments({
  admin,
  initialOverview,
  initialOverviewFailed = false,
}: AdminBillingPaymentsProps) {
  const cycleSettings = useBillingCycleSettings();
  const billingPricing = useBillingPricingConfig();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("ALL");
  const [sendingBusinessKey, setSendingBusinessKey] = useState<string | null>(null);
  const [sendingWhatsAppBusinessKey, setSendingWhatsAppBusinessKey] = useState<string | null>(null);
  const [followUpBusiness, setFollowUpBusiness] = useState<BusinessPortfolioRow | null>(null);
  const [, startSendTransition] = useTransition();
  const [, startWhatsAppTransition] = useTransition();

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useAdminDashboardOverview({
    initialData: initialOverview,
  });
  const { data: billingSummaries = [] } = useBillingSummaries();

  const loadFailed = initialOverviewFailed || (isError && !data);

  const summaryByKey = useMemo(() => {
    const map = new Map<string, BillingAccountSummaryDto>();
    for (const summary of billingSummaries) {
      map.set(summary.businessKey, summary);
    }
    return map;
  }, [billingSummaries]);

  const paymentCopy = useMemo(
    () => getBillingPaymentStatusCopy(cycleSettings),
    [cycleSettings],
  );

  const paymentStatusLabels: Record<AdminPortfolioPaymentStatus, string> = {
    CURRENT: paymentCopy.labels.current,
    DUE_SOON: paymentCopy.labels.dueSoon,
    OVERDUE: paymentCopy.labels.overdue,
    EXPIRED: paymentCopy.labels.expired,
    UNKNOWN: paymentCopy.labels.unknown,
  };

  const filterSegments = useMemo(() => {
    const copy = getBillingPaymentStatusCopy(cycleSettings);
    return [
      {
        key: "OVERDUE" as const,
        label: copy.labels.overdue,
        hint: copy.hints.overdue,
      },
      {
        key: "DUE_SOON" as const,
        label: copy.labels.dueSoon,
        hint: copy.hints.dueSoon,
      },
      {
        key: "EXPIRED" as const,
        label: copy.labels.expired,
        hint: copy.hints.expired,
      },
      {
        key: "CURRENT" as const,
        label: copy.labels.current,
        hint: copy.hints.current,
      },
      {
        key: "UNKNOWN" as const,
        label: copy.labels.unknown,
        hint: copy.hints.unknown,
      },
    ];
  }, [cycleSettings]);

  const statusCounts = useMemo(
    () => countBusinessesByPaymentStatus(data?.businesses ?? [], new Date(), cycleSettings),
    [data?.businesses, cycleSettings],
  );

  const filteredBusinesses = useMemo(() => {
    const businesses = data?.businesses ?? [];
    const query = search.trim().toLowerCase();

    let rows = businesses.filter((business) => {
      if (
        paymentFilter !== "ALL" &&
        getBusinessPaymentStatus(business, new Date(), undefined, undefined, cycleSettings) !==
          paymentFilter
      ) {
        return false;
      }
      if (!query) return true;

      if (business.businessName.toLowerCase().includes(query)) return true;
      if (business.ownerName?.toLowerCase().includes(query)) return true;
      if (business.businessEmail?.toLowerCase().includes(query)) return true;
      return false;
    });

    rows = [...rows].sort((a, b) => {
      const priority = (status: AdminPortfolioPaymentStatus) => {
        switch (status) {
          case "EXPIRED":
            return 0;
          case "OVERDUE":
            return 1;
          case "DUE_SOON":
            return 2;
          case "UNKNOWN":
            return 3;
          default:
            return 4;
        }
      };

      const statusDiff =
        priority(getBusinessPaymentStatus(a, new Date(), undefined, undefined, cycleSettings)) -
        priority(getBusinessPaymentStatus(b, new Date(), undefined, undefined, cycleSettings));
      if (statusDiff !== 0) return statusDiff;

      const aRenewal = a.renewalDueAt
        ? new Date(a.renewalDueAt).getTime()
        : Number.MAX_SAFE_INTEGER;
      const bRenewal = b.renewalDueAt
        ? new Date(b.renewalDueAt).getTime()
        : Number.MAX_SAFE_INTEGER;
      if (aRenewal !== bRenewal) return aRenewal - bRenewal;

      return a.businessName.localeCompare(b.businessName);
    });

    return rows;
  }, [data?.businesses, paymentFilter, search, cycleSettings]);

  function handleSendInvoice(businessKey: string) {
    setSendingBusinessKey(businessKey);
    startSendTransition(async () => {
      try {
        const result = await sendBusinessInvoice(businessKey);
        toast({
          title: admin.billing.invoiceSent,
          description: admin.billing.invoiceSentDescription.replace(
            "{email}",
            result.sentTo,
          ),
        });
        void queryClient.invalidateQueries({ queryKey: ["billing-summaries"] });
        void queryClient.invalidateQueries({
          queryKey: ["billing-account", businessKey],
        });
      } catch (error) {
        let message: string = admin.billing.invoiceFailed;
        if (error instanceof ApiError) {
          const bodyMessage = error.body.message?.trim();
          if (bodyMessage) message = bodyMessage;
          else if (error.status === 503) {
            message = admin.billing.invoiceSmtpNotConfigured;
          }
        }
        toast({ title: message });
      } finally {
        setSendingBusinessKey(null);
      }
    });
  }

  function handleSendWhatsAppReminder(businessKey: string) {
    setSendingWhatsAppBusinessKey(businessKey);
    startWhatsAppTransition(async () => {
      try {
        const result = await sendBillingWhatsAppReminder(businessKey);
        window.open(result.whatsappUrl, "_blank", "noopener,noreferrer");
        toast({
          title: admin.billing.whatsAppReminderOpened,
          description: admin.billing.whatsAppReminderOpenedDescription.replace(
            "{phone}",
            result.phone,
          ),
        });
        void queryClient.invalidateQueries({ queryKey: ["billing-summaries"] });
        void queryClient.invalidateQueries({ queryKey: ["billing-account", businessKey] });
      } catch (error) {
        let message: string = admin.billing.whatsAppReminderFailed;
        if (error instanceof ApiError) {
          const bodyMessage = error.body.message?.trim();
          if (bodyMessage) message = bodyMessage;
        }
        toast({ title: message });
      } finally {
        setSendingWhatsAppBusinessKey(null);
      }
    });
  }

  return (
    <div className="space-y-6">
      <AdminPageIntro
        title={admin.billing.title}
        subtitle={admin.billing.subtitle}
        meta={formatPricingTiersSummary(billingPricing, Math.round(billingPricing.gstRate * 100))}
        nav={admin.nav}
      />

      {loadFailed ? (
        <AdminLoadErrorBanner
          message={admin.overview.loadFailed}
          retryLabel={admin.overview.retry}
          onRetry={() => void refetch()}
        />
      ) : null}

      {!loadFailed ? (
        <>
      <BillingStatusSummary
        title={admin.portfolio.dashboard.subscription.title}
        subtitle={admin.portfolio.dashboard.subscription.subtitle}
        allLabel={admin.billing.filterAll}
        counts={statusCounts}
        totalBusinesses={data?.totalBusinesses ?? 0}
        activeFilter={paymentFilter}
        onFilterChange={setPaymentFilter}
        segments={filterSegments}
        isLoading={isLoading}
      />

      <div className="space-y-3 rounded-card border border-border bg-surface-card p-4 shadow-card sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-text-muted">
            {admin.billing.showingBusinesses
              .replace("{shown}", String(filteredBusinesses.length))
              .replace("{total}", String(data?.totalBusinesses ?? 0))}
          </p>
        </div>

        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={admin.billing.searchPlaceholder}
            className="pl-9"
            aria-label={admin.billing.searchPlaceholder}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3" aria-live="polite">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-40 rounded-card" />
          ))}
        </div>
      ) : filteredBusinesses.length === 0 ? (
        <div className="rounded-card border border-border bg-surface-card p-8 text-center shadow-card">
          <p className="text-text-secondary">{admin.billing.empty}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBusinesses.map((business) => {
            const summary = summaryByKey.get(business.businessKey);
            const invoiceSent = Boolean(summary?.lastInvoiceSentAt);

            return (
              <BillingBusinessCard
                key={business.businessKey}
                business={business}
                billing={admin.billing}
                statusLabels={paymentStatusLabels}
                onSendInvoice={handleSendInvoice}
                isSendingInvoice={sendingBusinessKey === business.businessKey}
                invoiceSent={invoiceSent}
                summary={summary}
                onFollowUp={setFollowUpBusiness}
                onSendWhatsAppReminder={handleSendWhatsAppReminder}
                isSendingWhatsApp={sendingWhatsAppBusinessKey === business.businessKey}
              />
            );
          })}
        </div>
      )}

        </>
      ) : null}

      <BillingFollowUpPane
        open={followUpBusiness !== null}
        onOpenChange={(open) => {
          if (!open) setFollowUpBusiness(null);
        }}
        business={followUpBusiness}
        copy={admin.billing.followUp}
        billingCopy={admin.billing}
        onWhatsAppSent={() => {
          void queryClient.invalidateQueries({ queryKey: ["billing-summaries"] });
          if (followUpBusiness) {
            void queryClient.invalidateQueries({
              queryKey: ["billing-account", followUpBusiness.businessKey],
            });
          }
        }}
      />
    </div>
  );
}

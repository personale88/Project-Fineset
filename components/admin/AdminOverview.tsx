"use client";

import { useMemo } from "react";
import { useAdminDashboardOverview } from "@/hooks/useAnalytics";
import { useBillingSummaries } from "@/hooks/useBillingFollowUps";
import { usePortfolioGrowthKpis } from "@/hooks/usePortfolioGrowthKpis";
import { AdminLoadErrorBanner } from "@/components/admin/AdminLoadErrorBanner";
import { AdminPortfolioStats } from "@/components/admin/overview/AdminPortfolioStats";
import { AdminPageIntro } from "@/components/admin/AdminPageIntro";
import { useBillingCycleSettings } from "@/components/admin/BillingCycleSettingsProvider";
import { getBillingPaymentStatusCopy } from "@/lib/utils/billing-status-labels";
import { computeAdminPortfolioExpansionKpis } from "@/lib/utils/admin-portfolio-expansion-kpis";
import { computeAdminPortfolioKpis } from "@/lib/utils/admin-portfolio-kpis";
import type { Content } from "@/content/en";
import type { AdminDashboardOverview } from "@/types";

type AdminContent = Content["admin"];

interface AdminOverviewProps {
  admin: AdminContent;
  initialOverview?: AdminDashboardOverview;
  initialOverviewFailed?: boolean;
}

export function AdminOverview({
  admin,
  initialOverview,
  initialOverviewFailed = false,
}: AdminOverviewProps) {
  const cycleSettings = useBillingCycleSettings();
  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useAdminDashboardOverview({
    initialData: initialOverview,
  });
  const {
    data: billingSummaries = [],
    isLoading: isBillingLoading,
    isError: isBillingError,
    refetch: refetchBilling,
  } = useBillingSummaries();
  const {
    data: growthMetrics,
    isLoading: isGrowthLoading,
    isError: isGrowthError,
    refetch: refetchGrowth,
  } = usePortfolioGrowthKpis();

  const overviewFailed =
    initialOverviewFailed || (isError && !data);
  const growthFailed = isGrowthError && !growthMetrics;

  const businesses = data?.businesses ?? [];

  const kpis = useMemo(
    () => computeAdminPortfolioKpis(businesses, billingSummaries, new Date(), cycleSettings),
    [businesses, billingSummaries, cycleSettings],
  );

  const expansion = useMemo(
    () => computeAdminPortfolioExpansionKpis(businesses),
    [businesses],
  );

  const paymentCopy = useMemo(
    () => getBillingPaymentStatusCopy(cycleSettings),
    [cycleSettings],
  );

  const paymentLabels = paymentCopy.labels;
  const paymentHints = paymentCopy.hints;

  return (
    <div className="space-y-6">
      <AdminPageIntro
        title={admin.overview.title}
        subtitle={admin.overview.subtitle}
        nav={admin.nav}
      />

      {overviewFailed ? (
        <AdminLoadErrorBanner
          message={admin.overview.loadFailed}
          retryLabel={admin.overview.retry}
          onRetry={() => void refetch()}
        />
      ) : null}

      {isBillingError ? (
        <AdminLoadErrorBanner
          message={admin.billing.loadFailed}
          retryLabel={admin.overview.retry}
          onRetry={() => void refetchBilling()}
        />
      ) : null}

      {growthFailed ? (
        <AdminLoadErrorBanner
          message={admin.overview.growthLoadFailed}
          retryLabel={admin.overview.retry}
          onRetry={() => void refetchGrowth()}
        />
      ) : null}

      {!overviewFailed ? (
        <AdminPortfolioStats
          copy={admin.portfolio.dashboard}
          paymentLabels={paymentLabels}
          paymentHints={paymentHints}
          kpis={kpis}
          expansion={expansion}
          growth={growthMetrics}
          isLoading={isLoading || isBillingLoading}
          isGrowthLoading={isGrowthLoading || growthFailed}
        />
      ) : null}
    </div>
  );
}

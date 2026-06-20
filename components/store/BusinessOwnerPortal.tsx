"use client";

import { PeriodSwitcher } from "@/components/shared/PeriodSwitcher";
import { useBusinessOwnerPeriod } from "@/components/store/BusinessOwnerPeriodProvider";
import { BusinessOwnerTeamActivity } from "@/components/store/BusinessOwnerTeamActivity";
import { BusinessOwnerWorkQueue } from "@/components/store/BusinessOwnerWorkQueue";
import { StorePortfolio } from "@/components/store/StorePortfolio";
import { buildPeriodSwitcherOptions } from "@/lib/utils/analytics-period-url";
import type { Content } from "@/content/en";
import type { GetAnalyticsParams, StoreManagerPortfolio } from "@/types";

type StoreContent = Content["store"];

interface BusinessOwnerPortalProps {
  copy: StoreContent;
  initialPortfolio?: StoreManagerPortfolio;
  initialParams?: GetAnalyticsParams;
}

function BusinessOwnerDashboardContent({
  copy,
  initialPortfolio,
  initialParams,
}: BusinessOwnerPortalProps) {
  const dashboardCopy = copy.ownerDashboard;
  const { period, setPeriod } = useBusinessOwnerPeriod();
  const periodOptions = buildPeriodSwitcherOptions(copy.period);

  return (
    <div className="space-y-8">
      <section className="space-y-6">
        <header className="space-y-1">
          <h1 className="font-display text-2xl font-bold text-text-primary sm:text-3xl">
            {dashboardCopy.title}
          </h1>
          <p className="text-sm text-text-muted">{dashboardCopy.subtitle}</p>
        </header>

        <PeriodSwitcher
          options={periodOptions}
          value={period}
          onChange={setPeriod}
        />

        <BusinessOwnerWorkQueue />
      </section>

      <StorePortfolio
        store={copy}
        initialPortfolio={initialPortfolio}
        initialParams={initialParams}
      />

      <BusinessOwnerTeamActivity />
    </div>
  );
}

export function BusinessOwnerPortal({
  copy,
  initialPortfolio,
  initialParams,
}: BusinessOwnerPortalProps) {
  return (
    <BusinessOwnerDashboardContent
      copy={copy}
      initialPortfolio={initialPortfolio}
      initialParams={initialParams}
    />
  );
}

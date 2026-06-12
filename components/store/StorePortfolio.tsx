"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useStoreManagerPortfolio } from "@/hooks/useStoreManagerPortfolio";
import { StorePerformanceCard } from "@/components/admin/overview/StorePerformanceCard";
import { PeriodSwitcher, type PeriodValue } from "@/components/shared/PeriodSwitcher";
import { Skeleton } from "@/components/ui/skeleton";
import { storeDetailPath } from "@/lib/utils/store-dashboard-url";
import type { Content } from "@/content/en";
import { buildPeriodSwitcherOptions, isPeriodValue } from "@/lib/utils/analytics-period-url";
import type { GetAnalyticsParams, StoreManagerPortfolio } from "@/types";

type StoreContent = Content["store"];

/** Horizontal carousel on small screens; grid from md up. */
const STORE_CAROUSEL_CLASS =
  "flex gap-4 overflow-x-auto scroll-smooth pb-2 snap-x snap-mandatory scroll-pl-0 [-webkit-overflow-scrolling:touch] md:grid md:grid-cols-2 md:overflow-visible md:pb-0 md:snap-none xl:grid-cols-3";

/** Width accounts for main horizontal padding (page-x / page-md). */
const STORE_CARD_SLIDE_CLASS =
  "w-[min(calc(100vw-32px),22rem)] shrink-0 snap-start sm:w-[min(calc(100vw-64px),22rem)] md:w-auto md:min-w-0 md:shrink";

interface StorePortfolioProps {
  store: StoreContent;
  initialPortfolio?: StoreManagerPortfolio;
  initialParams?: GetAnalyticsParams;
}

export function StorePortfolio({
  store,
  initialPortfolio,
  initialParams,
}: StorePortfolioProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [period, setPeriodState] = useState<PeriodValue>(() => {
    const fromUrl = searchParams.get("period");
    if (isPeriodValue(fromUrl)) return fromUrl;
    const fromInitial = initialParams?.period ?? null;
    if (isPeriodValue(fromInitial)) return fromInitial;
    return "today";
  });

  const setPeriod = useCallback(
    (value: PeriodValue) => {
      setPeriodState(value);
      const next = new URLSearchParams(searchParams.toString());
      next.set("period", value);
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const params = useMemo(() => ({ period }), [period]);

  const { data, isLoading, isFetching } = useStoreManagerPortfolio(params, {
    initialData: initialPortfolio,
    initialParams,
  });

  const periodOptions = buildPeriodSwitcherOptions(store.period);

  const stores = data?.stores ?? [];
  const loading = isLoading || isFetching;
  const cardLabels = useMemo(
    () => ({
      totalVisits: store.kpis.totalVisits,
      totalRevenue: store.kpis.totalRevenue,
      conversionRate: store.kpis.conversionRate,
      avgTicketSize: store.kpis.avgTransaction,
      schemesEnrolled: store.rsoPerformance.table.schemesEnrolled,
      totalStaff: store.portfolio.staffCount,
      fieldSales: store.portfolio.fieldSales,
      userCalls: store.portfolio.userCalls,
      storeManager: store.portfolio.storeManager,
      storeManagerPhone: store.portfolio.storeManagerPhone,
      notAvailable: store.portfolio.notAvailable,
      active: store.portfolio.active,
      inactive: store.portfolio.inactive,
      viewDetails: store.portfolio.viewDetails,
      deltaPeriod: store.deltaPeriod,
    }),
    [store],
  );

  return (
    <div className="min-w-0 space-y-6">
      <div className="space-y-4">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold text-text-primary">
            {store.portfolio.title}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">{store.portfolio.subtitle}</p>
        </div>
        <PeriodSwitcher
          options={periodOptions}
          value={period}
          onChange={setPeriod}
          className="mt-1"
        />
      </div>

      {loading ? (
        <div className={STORE_CAROUSEL_CLASS} aria-live="polite">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton
              key={index}
              className={`h-80 rounded-card ${STORE_CARD_SLIDE_CLASS}`}
            />
          ))}
          <div
            className="w-page-x shrink-0 sm:w-page-md md:hidden"
            aria-hidden
          />
        </div>
      ) : stores.length === 0 ? (
        <div className="rounded-card border border-border bg-surface-card p-8 text-center shadow-card">
          <p className="text-text-secondary">{store.portfolio.emptyStores}</p>
        </div>
      ) : (
        <div
          className={STORE_CAROUSEL_CLASS}
          role="list"
          aria-label={store.portfolio.title}
        >
          {stores.map((row) => (
            <div key={row.storeId} role="listitem" className={STORE_CARD_SLIDE_CLASS}>
              <StorePerformanceCard
                store={row}
                detailHref={storeDetailPath(row.storeId)}
                labels={cardLabels}
                className="h-full"
              />
            </div>
          ))}
          <div
            className="w-page-x shrink-0 sm:w-page-md md:hidden"
            aria-hidden
          />
        </div>
      )}
    </div>
  );
}

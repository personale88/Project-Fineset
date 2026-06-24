"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown, Check } from "lucide-react";
import { useBusinessOwnerPeriod } from "@/components/store/BusinessOwnerPeriodProvider";
import { useStoreManagerPortfolio } from "@/hooks/useStoreManagerPortfolio";
import { StorePerformanceCard } from "@/components/admin/overview/StorePerformanceCard";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { storeDetailPath } from "@/lib/utils/store-dashboard-url";
import {
  DEFAULT_STORE_PORTFOLIO_SORT,
  sortStorePerformanceRows,
  STORE_PORTFOLIO_SORT_KEYS,
  type StorePortfolioSortKey,
} from "@/lib/utils/store-portfolio-sort";
import type { Content } from "@/content/en";
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
  const { period } = useBusinessOwnerPeriod();
  const params = useMemo(() => ({ period }), [period]);
  const [sortBy, setSortBy] = useState<StorePortfolioSortKey>(DEFAULT_STORE_PORTFOLIO_SORT);

  const { data, isLoading, isFetching } = useStoreManagerPortfolio(params, {
    initialData: initialPortfolio,
    initialParams,
  });

  const stores = useMemo(
    () => sortStorePerformanceRows(data?.stores ?? [], sortBy),
    [data?.stores, sortBy],
  );
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
    }),
    [store],
  );

  return (
    <div className="min-w-0 space-y-6">
      <header className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h2 className="font-display text-2xl font-bold text-text-primary">
            {store.portfolio.title}
          </h2>
          <p className="text-sm text-text-muted">{store.portfolio.subtitle}</p>
        </div>
        {!loading && stores.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                aria-label={store.portfolio.sortLabel}
              >
                <ArrowUpDown className="h-4 w-4" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-80 w-56 overflow-y-auto">
              <DropdownMenuLabel>{store.portfolio.sortLabel}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {STORE_PORTFOLIO_SORT_KEYS.map((key) => (
                <DropdownMenuItem
                  key={key}
                  onSelect={() => setSortBy(key)}
                  className={cn(
                    "justify-between gap-2",
                    sortBy === key && "bg-surface-secondary/80 font-medium",
                  )}
                >
                  <span>{store.portfolio.sortOptions[key]}</span>
                  {sortBy === key ? (
                    <Check className="h-4 w-4 shrink-0 text-brand-gold" aria-hidden />
                  ) : null}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </header>

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

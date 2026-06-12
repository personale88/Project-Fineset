"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, MapPin } from "lucide-react";
import { useStoreOverviewBundle } from "@/hooks/useStoreOverviewBundle";
import { StoreBusinessOverviewSection } from "@/components/store/StoreBusinessOverview";
import { StoreCallsOverviewSection } from "@/components/store/StoreCallsOverview";
import { StoreFieldSalesOverviewSection } from "@/components/store/StoreFieldSalesOverview";
import { StoreRsoPerformanceSection } from "@/components/store/StoreRsoPerformance";
import { PeriodSwitcher, type PeriodValue } from "@/components/shared/PeriodSwitcher";
import { Button } from "@/components/ui/button";
import { isStoreKPIs } from "@/lib/utils/type-guards";
import { buildPeriodSwitcherOptions, isPeriodValue } from "@/lib/utils/analytics-period-url";
import { formatStoreLocation } from "@/lib/utils/format-store-location";
import {
  portalDashboardPath,
  portalSectionPath,
  SELECTED_STORE_STORAGE_KEY,
  storeDetailHrefForRole,
} from "@/lib/utils/store-dashboard-url";
import type { StoreOverviewBundle } from "@/lib/services/store-overview-bundle";
import type { Content } from "@/content/en";
import type { GetAnalyticsParams, StoreKPIDeltas } from "@/types";

type StoreContent = Content["store"];

interface StoreDetailOverviewProps {
  storeId: string;
  store: StoreContent;
  portalRole?: "STORE_MANAGER" | "BUSINESS_OWNER";
  showStaffNav?: boolean;
  initialOverviewBundle?: StoreOverviewBundle;
  initialOverviewParams?: GetAnalyticsParams;
}

export function StoreDetailOverview({
  storeId,
  store: storeFromPage,
  portalRole = "BUSINESS_OWNER",
  showStaffNav = true,
  initialOverviewBundle,
  initialOverviewParams,
}: StoreDetailOverviewProps) {
  const store = { ...storeFromPage };
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [period, setPeriodState] = useState<PeriodValue>(() => {
    const fromUrl = searchParams.get("period");
    if (isPeriodValue(fromUrl)) return fromUrl;
    const fromInitial = initialOverviewParams?.period ?? null;
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

  const analyticsParams = useMemo(
    () => ({ period, storeId }),
    [period, storeId],
  );

  const { data: overview, isLoading, isFetching } = useStoreOverviewBundle(
    analyticsParams,
    {
      initialBundle:
        initialOverviewParams?.storeId === storeId &&
        initialOverviewParams?.period === period
          ? initialOverviewBundle
          : undefined,
      initialParams:
        initialOverviewParams?.storeId === storeId &&
        initialOverviewParams?.period === period
          ? initialOverviewParams
          : undefined,
    },
  );

  const loading = isLoading || isFetching;
  const bundleHydrated = Boolean(overview);

  const storeMeta = useMemo(() => {
    const stores = overview?.myStores?.data ?? initialOverviewBundle?.myStores.data ?? [];
    return stores.find((s) => s.id === storeId);
  }, [overview, initialOverviewBundle, storeId]);

  useEffect(() => {
    window.localStorage.setItem(SELECTED_STORE_STORAGE_KEY, storeId);
  }, [storeId]);

  const kpiPayload = overview?.kpis;
  const kpis = kpiPayload && isStoreKPIs(kpiPayload.kpis) ? kpiPayload.kpis : null;
  const deltas = kpiPayload?.kpiDeltas as StoreKPIDeltas | undefined;

  const periodOptions = buildPeriodSwitcherOptions(store.period);
  const periodLabel = periodOptions.find((o) => o.value === period)?.label ?? "";
  const detail = store.storeDetail;
  const storeLocation = storeMeta
    ? formatStoreLocation(storeMeta.city, storeMeta.state)
    : null;
  const dashboardPath = portalDashboardPath(portalRole);

  return (
    <div className="min-w-0 space-y-6">
      <div className="space-y-3">
        <Link
          href={dashboardPath}
          prefetch={false}
          className="inline-flex items-center gap-1 text-sm font-medium text-text-secondary hover:text-brand-gold"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {detail.backToPortfolio}
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold text-text-primary">
              {storeMeta?.name ?? detail.titleFallback}
            </h1>
            {storeLocation ? (
              <p className="mt-1 flex items-center gap-1 text-sm text-text-secondary">
                <MapPin className="h-4 w-4 shrink-0" aria-hidden />
                <span>{storeLocation}</span>
              </p>
            ) : null}
          </div>
          <PeriodSwitcher
            options={periodOptions}
            value={period}
            onChange={setPeriod}
            className="shrink-0"
          />
        </div>

        <nav
          className="mt-8 flex flex-wrap gap-2"
          aria-label={detail.storeSectionNavLabel}
        >
          <Button asChild size="sm" variant="default">
            <Link
              href={storeDetailHrefForRole(storeId, portalRole, period)}
              prefetch={false}
              aria-current="page"
            >
              {detail.viewOverview}
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link
              href={portalSectionPath("visits", portalRole, storeId)}
              prefetch={false}
            >
              {detail.viewVisits}
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link
              href={portalSectionPath("calls", portalRole, storeId)}
              prefetch={false}
            >
              {detail.viewCalls}
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link
              href={portalSectionPath("field-sales", portalRole, storeId)}
              prefetch={false}
            >
              {detail.viewFieldSales}
            </Link>
          </Button>
          {showStaffNav ? (
            <Button asChild size="sm" variant="outline">
              <Link
                href={portalSectionPath("staff", portalRole, storeId)}
                prefetch={false}
              >
                {detail.viewStaff}
              </Link>
            </Button>
          ) : null}
        </nav>
      </div>

      <StoreBusinessOverviewSection
        copy={store.businessOverview}
        kpiLabels={store.kpis}
        periodLabel={periodLabel}
        deltaPeriod={store.deltaPeriod}
        kpis={kpis}
        deltas={deltas}
        isLoading={loading}
      />

      <StoreCallsOverviewSection
        copy={store.callsOverview}
        period={period}
        periodLabel={periodLabel}
        deltaPeriod={store.deltaPeriod}
        storeId={storeId}
        initialData={bundleHydrated ? overview?.calls : undefined}
        initialParams={bundleHydrated ? analyticsParams : undefined}
      />

      <StoreFieldSalesOverviewSection
        copy={store.fieldSalesOverview}
        period={period}
        periodLabel={periodLabel}
        deltaPeriod={store.deltaPeriod}
        storeId={storeId}
        initialData={bundleHydrated ? overview?.fieldSales : undefined}
        initialParams={bundleHydrated ? analyticsParams : undefined}
      />

      <StoreRsoPerformanceSection
        copy={store.rsoPerformance}
        periodLabels={store.period}
        period={period}
        emptyMessage={store.rsoPerformance.empty}
        storeId={storeId}
        initialData={bundleHydrated ? overview?.rsoPerformance : undefined}
        initialParams={bundleHydrated ? analyticsParams : undefined}
      />
    </div>
  );
}

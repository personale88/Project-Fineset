"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, MapPin } from "lucide-react";
import { useStoreOverviewBundle } from "@/hooks/useStoreOverviewBundle";
import { StoreBusinessOverviewSection } from "@/components/store/StoreBusinessOverview";
import { StoreCallsOverviewSection } from "@/components/store/StoreCallsOverview";
import { StoreFieldSalesOverviewSection } from "@/components/store/StoreFieldSalesOverview";
import { StoreRsoPerformanceSection } from "@/components/store/StoreRsoPerformance";
import { PeriodSwitcher, type PeriodValue } from "@/components/shared/PeriodSwitcher";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { ADMIN_DASHBOARD_PATH } from "@/lib/auth/routes";
import { isStoreKPIs } from "@/lib/utils/type-guards";
import { buildPeriodSwitcherOptions, isPeriodValue } from "@/lib/utils/analytics-period-url";
import { formatStoreLocation } from "@/lib/utils/format-store-location";
import {
  adminSectionPath,
  adminStoreDetailHref,
} from "@/lib/utils/admin-dashboard-url";
import type { StoreOverviewBundle } from "@/lib/services/store-overview-bundle";
import type { Content } from "@/content/en";
import type { GetAnalyticsParams, StoreKPIDeltas } from "@/types";

type AdminContent = Content["admin"];
type StoreContent = Content["store"];

interface AdminStoreDetailProps {
  storeId: string;
  admin: AdminContent;
  storeCopy: StoreContent;
  initialOverviewBundle?: StoreOverviewBundle;
  initialOverviewParams?: GetAnalyticsParams;
}

export function AdminStoreDetail({
  storeId,
  admin,
  storeCopy,
  initialOverviewBundle,
  initialOverviewParams,
}: AdminStoreDetailProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const detail = admin.storeDetail;
  const logDashboardBase = ADMIN_DASHBOARD_PATH;

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

  const { data: overview, isLoading, isFetching, isError } = useStoreOverviewBundle(
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

  const kpiPayload = overview?.kpis;
  const kpis = kpiPayload && isStoreKPIs(kpiPayload.kpis) ? kpiPayload.kpis : null;
  const deltas = kpiPayload?.kpiDeltas as StoreKPIDeltas | undefined;

  const periodOptions = buildPeriodSwitcherOptions(admin.period);
  const periodLabel = periodOptions.find((o) => o.value === period)?.label ?? "";
  const storeLocation = storeMeta
    ? formatStoreLocation(storeMeta.city, storeMeta.state)
    : null;

  if (isError) {
    return (
      <div className="space-y-4">
        <BackLink label={detail.backToPortfolio} />
        <EmptyState message={detail.notFound} />
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-6">
      <div className="space-y-3">
        <BackLink label={detail.backToPortfolio} />

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
              href={adminStoreDetailHref(storeId, period)}
              prefetch={false}
              aria-current="page"
            >
              {detail.viewOverview}
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={adminSectionPath("visits", storeId)} prefetch={false}>
              {detail.viewVisits}
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={adminSectionPath("calls", storeId)} prefetch={false}>
              {detail.viewCalls}
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={adminSectionPath("field-sales", storeId)} prefetch={false}>
              {detail.viewFieldSales}
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={adminSectionPath("staff", storeId)} prefetch={false}>
              {detail.viewStaff}
            </Link>
          </Button>
        </nav>
      </div>

      <StoreBusinessOverviewSection
        copy={storeCopy.businessOverview}
        kpiLabels={storeCopy.kpis}
        periodLabel={periodLabel}
        deltaPeriod={storeCopy.deltaPeriod}
        kpis={kpis}
        deltas={deltas}
        isLoading={loading}
      />

      <StoreCallsOverviewSection
        copy={storeCopy.callsOverview}
        period={period}
        periodLabel={periodLabel}
        deltaPeriod={storeCopy.deltaPeriod}
        storeId={storeId}
        logDashboardBase={logDashboardBase}
        initialData={bundleHydrated ? overview?.calls : undefined}
        initialParams={bundleHydrated ? analyticsParams : undefined}
      />

      <StoreFieldSalesOverviewSection
        copy={storeCopy.fieldSalesOverview}
        period={period}
        periodLabel={periodLabel}
        deltaPeriod={storeCopy.deltaPeriod}
        storeId={storeId}
        logDashboardBase={logDashboardBase}
        initialData={bundleHydrated ? overview?.fieldSales : undefined}
        initialParams={bundleHydrated ? analyticsParams : undefined}
      />

      <StoreRsoPerformanceSection
        copy={storeCopy.rsoPerformance}
        periodLabels={storeCopy.period}
        period={period}
        emptyMessage={storeCopy.rsoPerformance.empty}
        storeId={storeId}
        initialData={bundleHydrated ? overview?.rsoPerformance : undefined}
        initialParams={bundleHydrated ? analyticsParams : undefined}
      />
    </div>
  );
}

function BackLink({ label }: { label: string }) {
  return (
    <Link
      href={ADMIN_DASHBOARD_PATH}
      prefetch={false}
      className="inline-flex items-center gap-1 text-sm font-medium text-text-secondary hover:text-brand-gold"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden />
      {label}
    </Link>
  );
}

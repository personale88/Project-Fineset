"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AdminMobileBackHeader } from "@/components/admin/AdminPageIntro";
import { AnalyticsAskPanel } from "@/components/admin/analytics/AnalyticsAskPanel";
import { AnalyticsCreditsRechargePane } from "@/components/admin/analytics/AnalyticsCreditsRechargePane";
import { AnalyticsPageToolbar, AnalyticsMobileScopeEdit, AnalyticsMobileScopeSummary } from "@/components/admin/analytics/AnalyticsPageToolbar";
import {
  buildAnalyticsScopeSummary,
  isAnalyticsScopeReady,
  toAnalyticsScopePayload,
  type AnalyticsScopeFilterValues,
} from "@/components/admin/analytics/AnalyticsScopeFilters";
import { usePlatformSettingsContext } from "@/components/admin/PlatformSettingsProvider";
import { useAnalyticsCredits } from "@/hooks/useAnalyticsCredits";
import { useAllStoresForFilter } from "@/hooks/useAllStoresForFilter";
import { ADMIN_DASHBOARD_PATH } from "@/lib/auth/routes";
import type { Content } from "@/content/en";

type AnalyticsContent = Content["admin"]["analytics"];

interface AdminBusinessAnalyticsProps {
  copy: AnalyticsContent;
  categories: Content["admin"]["categories"];
  common: Content["common"];
  errors: Content["errors"];
}

const defaultScopeFilters: AnalyticsScopeFilterValues = {
  city: "all",
  category: "all",
  storeId: "",
};

export function AdminBusinessAnalytics({
  copy,
  categories,
  common,
  errors,
}: AdminBusinessAnalyticsProps) {
  const [scopeFilters, setScopeFilters] =
    useState<AnalyticsScopeFilterValues>(defaultScopeFilters);
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [scopeFiltersOpen, setScopeFiltersOpen] = useState(false);
  const rechargeAutoOpenedRef = useRef(false);

  const { settings } = usePlatformSettingsContext();
  const analyticsEnabled = settings.analytics.enabled;

  const {
    data: credits,
    isLoading: creditsLoading,
    isFetching: creditsFetching,
    isError: creditsError,
    refetch: refetchCredits,
  } = useAnalyticsCredits();

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1023px)");

    const syncOverscrollClass = () => {
      document.documentElement.classList.toggle("analytics-no-overscroll", mediaQuery.matches);
    };

    syncOverscrollClass();
    mediaQuery.addEventListener("change", syncOverscrollClass);
    return () => {
      mediaQuery.removeEventListener("change", syncOverscrollClass);
      document.documentElement.classList.remove("analytics-no-overscroll");
    };
  }, []);

  const { data: storesResult, isLoading: storesLoading } = useAllStoresForFilter();

  const storeOptions = useMemo(
    () =>
      (storesResult?.data ?? []).map((store) => ({
        id: store.id,
        name: store.name,
        city: store.city,
        category: store.category,
      })),
    [storesResult?.data],
  );

  const scopePayload = useMemo(
    () => toAnalyticsScopePayload(scopeFilters),
    [scopeFilters],
  );

  const scopeSummary = useMemo(
    () =>
      buildAnalyticsScopeSummary(
        scopeFilters,
        storeOptions,
        categories,
        copy.selectStoreLabel,
        copy.allStoresLabel,
      ),
    [scopeFilters, storeOptions, categories, copy.selectStoreLabel, copy.allStoresLabel],
  );

  const scopeReady = isAnalyticsScopeReady(scopeFilters.storeId);
  const balanceCredits = credits?.balanceCredits;
  const outOfCredits = balanceCredits === 0;

  const handleRechargeOpenChange = useCallback((open: boolean) => {
    setRechargeOpen(open);
    if (!open) {
      rechargeAutoOpenedRef.current = true;
    }
  }, []);

  const handleOpenRecharge = useCallback(() => {
    setRechargeOpen(true);
  }, []);

  const handleInsufficientCredits = useCallback(() => {
    if (!rechargeAutoOpenedRef.current) {
      rechargeAutoOpenedRef.current = true;
      setRechargeOpen(true);
    }
  }, []);

  if (!analyticsEnabled) {
    return (
      <div className="space-y-6">
        <AdminMobileBackHeader
          title={copy.title}
          backHref={ADMIN_DASHBOARD_PATH}
          backLabel={common.back}
        />
        <div className="rounded-card border border-border bg-surface-secondary/30 p-6 text-center">
          <p className="font-display text-lg font-semibold text-text-primary">
            {copy.ask.analyticsDisabledTitle}
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-text-secondary">
            {copy.ask.analyticsDisabledDescription}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      data-analytics-page
    >
      <div className="shrink-0 overflow-visible pb-2 lg:pb-2.5">
        <AdminMobileBackHeader
          title={copy.title}
          backHref={ADMIN_DASHBOARD_PATH}
          backLabel={common.back}
          backTrailing={<AnalyticsMobileScopeSummary scopeSummary={scopeSummary} />}
          titleTrailing={
            <AnalyticsMobileScopeEdit
              editLabel={copy.filtersEditLabel}
              onEdit={() => setScopeFiltersOpen(true)}
            />
          }
        />
        <AnalyticsPageToolbar
          analyticsCopy={copy}
          categories={categories}
          stores={storeOptions}
          scopeFilters={scopeFilters}
          onScopeFiltersChange={setScopeFilters}
          storesLoading={storesLoading}
          scopeFiltersOpen={scopeFiltersOpen}
          onScopeFiltersOpenChange={setScopeFiltersOpen}
        />
      </div>

      <AnalyticsAskPanel
        className="min-h-0 flex-1 overflow-hidden"
        pageTitle={copy.title}
        pageSubtitle={copy.subtitle}
        copy={copy.ask}
        creditsCopy={copy.credits}
        common={common}
        errors={errors}
        kpis={copy.kpis}
        emptyBreakdown={copy.emptyBreakdown}
        scopeReady={scopeReady}
        storeId={scopePayload.storeId}
        city={scopePayload.city}
        storeCategory={scopePayload.storeCategory}
        balanceCredits={balanceCredits}
        lowBalanceThreshold={credits?.lowBalanceThreshold}
        creditsLoading={creditsLoading}
        creditsFetching={creditsFetching}
        creditsError={creditsError}
        onRetryCredits={() => void refetchCredits()}
        outOfCredits={outOfCredits}
        onRecharge={handleOpenRecharge}
        onInsufficientCredits={handleInsufficientCredits}
        onOpenScopeFilters={() => setScopeFiltersOpen(true)}
      />

      <AnalyticsCreditsRechargePane
        open={rechargeOpen}
        onOpenChange={handleRechargeOpenChange}
        copy={copy.credits}
      />
    </div>
  );
}

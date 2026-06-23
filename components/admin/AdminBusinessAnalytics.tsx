"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminPageIntro } from "@/components/admin/AdminPageIntro";
import { AnalyticsAskPanel } from "@/components/admin/analytics/AnalyticsAskPanel";
import {
  AnalyticsScopeFilters,
  buildAnalyticsScopeSummary,
  resolveAnalyticsStoreId,
  toAnalyticsScopePayload,
  type AnalyticsScopeFilterValues,
} from "@/components/admin/analytics/AnalyticsScopeFilters";
import { useAllStoresForFilter } from "@/hooks/useAllStoresForFilter";
import type { Content } from "@/content/en";

type AnalyticsContent = Content["admin"]["analytics"];

interface AdminBusinessAnalyticsProps {
  copy: AnalyticsContent;
  nav: Content["admin"]["nav"];
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
  nav,
  categories,
  common,
  errors,
}: AdminBusinessAnalyticsProps) {
  const [scopeFilters, setScopeFilters] =
    useState<AnalyticsScopeFilterValues>(defaultScopeFilters);

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

  const { data: storesResult } = useAllStoresForFilter();

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

  const [prevStoreOptions, setPrevStoreOptions] = useState(storeOptions);
  if (storeOptions !== prevStoreOptions) {
    setPrevStoreOptions(storeOptions);
    if (storeOptions.length > 0) {
      setScopeFilters((current) => {
        const storeId = resolveAnalyticsStoreId(current, storeOptions);
        if (storeId === current.storeId) return current;
        return { ...current, storeId };
      });
    }
  }

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
      ),
    [scopeFilters, storeOptions, categories, copy.selectStoreLabel],
  );

  return (
    <div
      className="mx-auto flex max-w-7xl min-h-0 flex-col max-lg:h-[var(--analytics-mobile-height)] max-lg:max-h-[var(--analytics-mobile-height)] max-lg:overflow-hidden max-lg:-mx-page-x max-lg:-my-4 lg:space-y-6 lg:py-0"
      data-analytics-page
    >
      <div className="shrink-0 space-y-0 lg:space-y-4">
        <AdminPageIntro
          title={copy.title}
          subtitle={copy.subtitle}
          nav={nav}
          className="px-page-x lg:px-0"
          navClassName="px-page-x lg:px-0"
        />
        <AnalyticsScopeFilters
          copy={copy}
          categories={categories}
          stores={storeOptions}
          values={scopeFilters}
          scopeSummary={scopeSummary}
          onChange={setScopeFilters}
        />
      </div>

      <AnalyticsAskPanel
        className="min-h-0 flex-1"
        copy={copy.ask}
        creditsCopy={copy.credits}
        common={common}
        errors={errors}
        kpis={copy.kpis}
        emptyBreakdown={copy.emptyBreakdown}
        scopeSummary={scopeSummary}
        storeId={scopePayload.storeId}
        city={scopePayload.city}
        storeCategory={scopePayload.storeCategory}
      />
    </div>
  );
}

"use client";

import { useCallback, useMemo } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { Content } from "@/content/en";
import type { StoreCategory } from "@/types";
import { cn } from "@/lib/utils/cn";

type AnalyticsCopy = Content["admin"]["analytics"];

/** Sentinel value for portfolio-wide (all stores) scope. */
export const ANALYTICS_ALL_STORES = "all";

export interface AnalyticsScopeFilterValues {
  city: string;
  category: string;
  storeId: string;
}

export interface AnalyticsScopeStoreOption {
  id: string;
  name: string;
  city: string;
  category: StoreCategory;
}

function filterStoresForScope(
  stores: AnalyticsScopeStoreOption[],
  values: Pick<AnalyticsScopeFilterValues, "city" | "category">,
): AnalyticsScopeStoreOption[] {
  return stores.filter((store) => {
    if (values.city !== "all" && store.city.toLowerCase() !== values.city.toLowerCase()) {
      return false;
    }
    if (values.category !== "all" && store.category !== values.category) {
      return false;
    }
    return true;
  });
}

export function resolveAnalyticsStoreId(
  values: AnalyticsScopeFilterValues,
  stores: AnalyticsScopeStoreOption[],
): string {
  const { storeId } = values;
  if (storeId === ANALYTICS_ALL_STORES) return ANALYTICS_ALL_STORES;
  if (!storeId) return "";

  const filtered = filterStoresForScope(stores, values);
  if (filtered.some((store) => store.id === storeId)) return storeId;
  return "";
}

export function isAnalyticsScopeReady(storeId: string): boolean {
  return storeId === ANALYTICS_ALL_STORES || (storeId.length > 0 && storeId !== "pending");
}

export function useAnalyticsScopeFilterState(
  stores: AnalyticsScopeStoreOption[],
  values: AnalyticsScopeFilterValues,
  onChange: (values: AnalyticsScopeFilterValues) => void,
) {
  const cities = useMemo(
    () =>
      [...new Set(stores.map((store) => store.city.trim()).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [stores],
  );

  const filteredStores = useMemo(
    () => filterStoresForScope(stores, values),
    [stores, values.category, values.city],
  );

  const updateValues = useCallback(
    (next: Partial<AnalyticsScopeFilterValues>) => {
      const merged = { ...values, ...next };

      if (next.city !== undefined || next.category !== undefined) {
        merged.storeId = resolveAnalyticsStoreId(merged, stores);
      }

      onChange(merged);
    },
    [onChange, stores, values],
  );

  return { cities, filteredStores, updateValues };
}

interface AnalyticsScopeFilterFieldsProps {
  copy: AnalyticsCopy;
  categories: Content["admin"]["categories"];
  cities: string[];
  filteredStores: AnalyticsScopeStoreOption[];
  values: AnalyticsScopeFilterValues;
  onUpdate: (next: Partial<AnalyticsScopeFilterValues>) => void;
  variant?: "default" | "header";
  className?: string;
}

const selectTriggerVariants = {
  default: "h-11 border-border bg-surface-card text-text-secondary",
  header:
    "h-7 border-border bg-surface-card px-2.5 py-0 text-xs text-text-secondary focus:ring-offset-0 focus-visible:ring-offset-0",
} as const;

export function AnalyticsScopeFilterFields({
  copy,
  categories,
  cities,
  filteredStores,
  values,
  onUpdate,
  variant = "default",
  className,
}: AnalyticsScopeFilterFieldsProps) {
  const isHeader = variant === "header";
  const labelClassName = isHeader ? "text-[11px] text-text-muted" : "text-xs text-text-muted";
  const gridClassName = isHeader
    ? "flex flex-wrap items-center gap-1.5"
    : "grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-3";

  return (
    <div className={cn(gridClassName, className)} aria-label={copy.filtersLabel}>
      <div className={cn(!isHeader && "space-y-1.5", isHeader && "w-[9.5rem] shrink-0 sm:w-[10.5rem]")}>
        {!isHeader ? (
          <Label htmlFor="analytics-city-filter" className={labelClassName}>
            {copy.cityFilterLabel}
          </Label>
        ) : null}
        <Select value={values.city} onValueChange={(city) => onUpdate({ city })}>
          <SelectTrigger
            id="analytics-city-filter"
            aria-label={copy.cityFilterLabel}
            className={selectTriggerVariants[variant]}
          >
            <SelectValue placeholder={copy.allCitiesLabel} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{copy.allCitiesLabel}</SelectItem>
            {cities.map((city) => (
              <SelectItem key={city} value={city}>
                {city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className={cn(!isHeader && "space-y-1.5", isHeader && "w-[9.5rem] shrink-0 sm:w-[10.5rem]")}>
        {!isHeader ? (
          <Label htmlFor="analytics-category-filter" className={labelClassName}>
            {copy.categoryFilterLabel}
          </Label>
        ) : null}
        <Select value={values.category} onValueChange={(category) => onUpdate({ category })}>
          <SelectTrigger
            id="analytics-category-filter"
            aria-label={copy.categoryFilterLabel}
            className={selectTriggerVariants[variant]}
          >
            <SelectValue placeholder={copy.allCategoriesLabel} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{copy.allCategoriesLabel}</SelectItem>
            {(Object.entries(categories) as [StoreCategory, string][]).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className={cn(!isHeader && "space-y-1.5", isHeader && "w-[9.5rem] shrink-0 sm:w-[10.5rem]")}>
        {!isHeader ? (
          <Label htmlFor="analytics-store-filter" className={labelClassName}>
            {copy.storeFilterLabel}
          </Label>
        ) : null}
        <Select
          value={values.storeId || "pending"}
          onValueChange={(storeId) => {
            if (storeId !== "pending") onUpdate({ storeId });
          }}
        >
          <SelectTrigger
            id="analytics-store-filter"
            aria-label={copy.storeFilterLabel}
            className={selectTriggerVariants[variant]}
          >
            <SelectValue placeholder={copy.selectStoreLabel} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending" disabled>
              {copy.selectStoreLabel}
            </SelectItem>
            <SelectItem value={ANALYTICS_ALL_STORES}>{copy.allStoresLabel}</SelectItem>
            {filteredStores.map((store) => (
              <SelectItem key={store.id} value={store.id}>
                {store.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export function AnalyticsScopeFilterSkeleton({
  variant = "default",
  className,
}: {
  variant?: "default" | "header";
  className?: string;
}) {
  const gridClassName =
    variant === "header"
      ? "flex flex-wrap items-center gap-1.5"
      : "grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-3";
  const heightClassName = variant === "header" ? "h-7" : "h-11";

  return (
    <div className={cn(gridClassName, className)}>
      <Skeleton className={cn(heightClassName, "w-full rounded-md")} />
      <Skeleton className={cn(heightClassName, "w-full rounded-md")} />
      <Skeleton className={cn(heightClassName, "w-full rounded-md")} />
    </div>
  );
}

export function toAnalyticsScopePayload(values: AnalyticsScopeFilterValues) {
  if (values.storeId === ANALYTICS_ALL_STORES) {
    return {
      storeId: undefined,
      city: values.city !== "all" ? values.city : undefined,
      storeCategory:
        values.category !== "all"
          ? (values.category as "JEWELRY" | "HANDBAGS" | "WATCHES" | "OTHER")
          : undefined,
    };
  }

  if (values.storeId) {
    return { storeId: values.storeId, city: undefined, storeCategory: undefined };
  }

  return { storeId: undefined, city: undefined, storeCategory: undefined };
}

export function buildAnalyticsScopeSummary(
  values: AnalyticsScopeFilterValues,
  stores: AnalyticsScopeStoreOption[],
  categories: Record<StoreCategory, string>,
  selectStoreLabel: string,
  allStoresLabel: string,
): string {
  if (!values.storeId) return selectStoreLabel;

  if (values.storeId === ANALYTICS_ALL_STORES) {
    const parts = [allStoresLabel];
    if (values.city !== "all") parts.push(values.city);
    if (values.category !== "all") parts.push(categories[values.category as StoreCategory]);
    return parts.join(" · ");
  }

  const store = stores.find((item) => item.id === values.storeId);
  return store?.name ?? selectStoreLabel;
}

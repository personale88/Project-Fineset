"use client";

import { useMemo, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Content } from "@/content/en";
import type { StoreCategory } from "@/types";

type AnalyticsCopy = Content["admin"]["analytics"];

export interface AnalyticsScopeFilterValues {
  city: string;
  category: string;
  storeId: string;
}

interface StoreOption {
  id: string;
  name: string;
  city: string;
  category: StoreCategory;
}

interface AnalyticsScopeFiltersProps {
  copy: AnalyticsCopy;
  categories: Content["admin"]["categories"];
  stores: StoreOption[];
  values: AnalyticsScopeFilterValues;
  scopeSummary: string;
  onChange: (values: AnalyticsScopeFilterValues) => void;
  className?: string;
}

const selectTriggerClassName = "h-11 border-border bg-surface-card";

function filterStoresForScope(
  stores: StoreOption[],
  values: Pick<AnalyticsScopeFilterValues, "city" | "category">,
): StoreOption[] {
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
  stores: StoreOption[],
): string {
  const filtered = filterStoresForScope(stores, values);
  if (values.storeId && filtered.some((store) => store.id === values.storeId)) {
    return values.storeId;
  }
  return filtered[0]?.id ?? "";
}

interface ScopeFilterFieldsProps {
  copy: AnalyticsCopy;
  categories: Content["admin"]["categories"];
  cities: string[];
  filteredStores: StoreOption[];
  values: AnalyticsScopeFilterValues;
  onUpdate: (next: Partial<AnalyticsScopeFilterValues>) => void;
}

function ScopeFilterFields({
  copy,
  categories,
  cities,
  filteredStores,
  values,
  onUpdate,
}: ScopeFilterFieldsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="analytics-city-filter" className="text-xs text-text-muted">
          {copy.cityFilterLabel}
        </Label>
        <Select value={values.city} onValueChange={(city) => onUpdate({ city })}>
          <SelectTrigger id="analytics-city-filter" className={selectTriggerClassName}>
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

      <div className="space-y-1.5">
        <Label htmlFor="analytics-category-filter" className="text-xs text-text-muted">
          {copy.categoryFilterLabel}
        </Label>
        <Select value={values.category} onValueChange={(category) => onUpdate({ category })}>
          <SelectTrigger id="analytics-category-filter" className={selectTriggerClassName}>
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

      <div className="space-y-1.5">
        <Label htmlFor="analytics-store-filter" className="text-xs text-text-muted">
          {copy.storeFilterLabel}
        </Label>
        <Select
          value={values.storeId || "pending"}
          onValueChange={(storeId) => {
            if (storeId !== "pending") onUpdate({ storeId });
          }}
          disabled={!values.storeId}
        >
          <SelectTrigger id="analytics-store-filter" className={selectTriggerClassName}>
            <SelectValue placeholder={copy.selectStoreLabel} />
          </SelectTrigger>
          <SelectContent>
            {!values.storeId ? (
              <SelectItem value="pending" disabled>
                {copy.selectStoreLabel}
              </SelectItem>
            ) : null}
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

export function AnalyticsScopeFilters({
  copy,
  categories,
  stores,
  values,
  scopeSummary,
  onChange,
  className,
}: AnalyticsScopeFiltersProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);

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

  function updateValues(next: Partial<AnalyticsScopeFilterValues>) {
    const merged = { ...values, ...next };

    if (next.city !== undefined || next.category !== undefined || next.storeId === undefined) {
      merged.storeId = resolveAnalyticsStoreId(merged, stores);
    }

    onChange(merged);
  }

  const filterFields = (
    <ScopeFilterFields
      copy={copy}
      categories={categories}
      cities={cities}
      filteredStores={filteredStores}
      values={values}
      onUpdate={updateValues}
    />
  );

  return (
    <section aria-label={copy.filtersLabel} className={className}>
      <div className="border-b border-border bg-surface-card lg:rounded-card lg:border lg:shadow-card lg:p-4">
        <div className="flex items-center gap-2 px-4 py-2 lg:hidden">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-text-primary">{scopeSummary}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 shrink-0 gap-1 px-2.5 text-text-secondary"
            onClick={() => setFiltersOpen(true)}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
            {copy.filtersEditLabel}
          </Button>
        </div>

        <div className="hidden lg:block">{filterFields}</div>
      </div>

      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="right" className="w-full p-0 sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{copy.filtersLabel}</SheetTitle>
            <SheetDescription>{copy.filtersSheetDescription}</SheetDescription>
          </SheetHeader>
          <SheetBody>{filterFields}</SheetBody>
        </SheetContent>
      </Sheet>
    </section>
  );
}

export function toAnalyticsScopePayload(values: AnalyticsScopeFilterValues) {
  if (!values.storeId) {
    return { storeId: undefined, city: undefined, storeCategory: undefined };
  }

  return { storeId: values.storeId, city: undefined, storeCategory: undefined };
}

export function buildAnalyticsScopeSummary(
  values: AnalyticsScopeFilterValues,
  stores: StoreOption[],
  _categories: Record<StoreCategory, string>,
  selectStoreLabel: string,
): string {
  const store = stores.find((item) => item.id === values.storeId);
  return store?.name ?? selectStoreLabel;
}

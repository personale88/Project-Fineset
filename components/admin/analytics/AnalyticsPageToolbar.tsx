"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AnalyticsScopeFilterFields,
  AnalyticsScopeFilterSkeleton,
  isAnalyticsScopeReady,
  resolveAnalyticsStoreId,
  useAnalyticsScopeFilterState,
  type AnalyticsScopeFilterValues,
  type AnalyticsScopeStoreOption,
} from "@/components/admin/analytics/AnalyticsScopeFilters";
import type { Content } from "@/content/en";

type AnalyticsCopy = Content["admin"]["analytics"];

interface AnalyticsMobileScopeSummaryProps {
  scopeSummary: string;
}

/** Selected store label on the analytics mobile back row (right-aligned). */
export function AnalyticsMobileScopeSummary({ scopeSummary }: AnalyticsMobileScopeSummaryProps) {
  return (
    <span className="min-w-0 truncate text-xs text-text-muted">{scopeSummary}</span>
  );
}

interface AnalyticsMobileScopeEditProps {
  editLabel: string;
  onEdit: () => void;
}

/** Edit scope trigger on the analytics mobile title row (right-aligned). */
export function AnalyticsMobileScopeEdit({ editLabel, onEdit }: AnalyticsMobileScopeEditProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-8 shrink-0 gap-1 px-2 text-text-muted"
      onClick={onEdit}
    >
      <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
      {editLabel}
    </Button>
  );
}

interface AnalyticsPageToolbarProps {
  analyticsCopy: AnalyticsCopy;
  categories: Content["admin"]["categories"];
  stores: AnalyticsScopeStoreOption[];
  scopeFilters: AnalyticsScopeFilterValues;
  onScopeFiltersChange: (values: AnalyticsScopeFilterValues) => void;
  storesLoading?: boolean;
  scopeFiltersOpen?: boolean;
  onScopeFiltersOpenChange?: (open: boolean) => void;
}

export function AnalyticsPageToolbar({
  analyticsCopy,
  categories,
  stores,
  scopeFilters,
  onScopeFiltersChange,
  storesLoading = false,
  scopeFiltersOpen: controlledOpen,
  onScopeFiltersOpenChange,
}: AnalyticsPageToolbarProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const scopeFiltersOpen = controlledOpen ?? internalOpen;
  const setScopeFiltersOpen = onScopeFiltersOpenChange ?? setInternalOpen;

  const { cities, filteredStores, updateValues } = useAnalyticsScopeFilterState(
    stores,
    scopeFilters,
    onScopeFiltersChange,
  );

  const scopeFilterFields = storesLoading ? (
    <AnalyticsScopeFilterSkeleton variant="header" />
  ) : (
    <AnalyticsScopeFilterFields
      copy={analyticsCopy}
      categories={categories}
      cities={cities}
      filteredStores={filteredStores}
      values={scopeFilters}
      onUpdate={updateValues}
      variant="header"
    />
  );

  const scopeFilterFieldsSheet = storesLoading ? (
    <AnalyticsScopeFilterSkeleton />
  ) : (
    <AnalyticsScopeFilterFields
      copy={analyticsCopy}
      categories={categories}
      cities={cities}
      filteredStores={filteredStores}
      values={scopeFilters}
      onUpdate={updateValues}
    />
  );

  const appliedStoreId = resolveAnalyticsStoreId(scopeFilters, stores);
  const canApplyScope = isAnalyticsScopeReady(appliedStoreId);

  function handleSubmitFilters() {
    setScopeFiltersOpen(false);
  }

  return (
    <>
      <div className="hidden shrink-0 flex-wrap items-center justify-end gap-1.5 lg:flex">
        {scopeFilterFields}
      </div>

      <Sheet open={scopeFiltersOpen} onOpenChange={setScopeFiltersOpen}>
        <SheetContent side="right" className="w-full p-0 sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{analyticsCopy.filtersLabel}</SheetTitle>
            <SheetDescription className="hidden lg:block">
              {analyticsCopy.filtersSheetDescription}
            </SheetDescription>
          </SheetHeader>
          <SheetBody>{scopeFilterFieldsSheet}</SheetBody>
          <SheetFooter>
            <Button
              type="button"
              className="w-full"
              disabled={storesLoading || !canApplyScope}
              onClick={handleSubmitFilters}
              data-testid="analytics-scope-filters-submit"
            >
              {analyticsCopy.filtersSubmitLabel}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}

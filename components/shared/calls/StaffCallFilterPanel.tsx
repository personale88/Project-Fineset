"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { ScrollableFilterRow, YearMonthFilters } from "@/components/shared/calls";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Content } from "@/content/en";
import type {
  StaffCallMasterFilter,
  StaffCallOccasionFilter,
  StaffCallQueue,
  StaffCallSegment,
  StaffCallValueTier,
} from "@/types";

type StaffCallsCopy = Content["staff"]["calls"];

interface StaffCallFilterPanelProps {
  copy: StaffCallsCopy;
  year: number;
  month: number;
  segment: StaffCallSegment;
  valueTier: StaffCallValueTier;
  queue: StaffCallQueue;
  master: StaffCallMasterFilter;
  birthday: StaffCallOccasionFilter;
  anniversary: StaffCallOccasionFilter;
  showAdvancedFilters: boolean;
  hasAdvancedFilters: boolean;
  activeAdvancedCount: number;
  customersCountLabel: string | null;
  yearOptions: number[];
  getMonthCount: (monthNumber: number) => number;
  getFilterCount: (
    group:
      | "masters"
      | "segments"
      | "valueTiers"
      | "queues"
      | "birthdays"
      | "anniversaries",
    key: string,
  ) => number;
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
  onMasterChange: (master: StaffCallMasterFilter) => void;
  onQueueChange: (queue: StaffCallQueue) => void;
  onSegmentChange: (segment: StaffCallSegment) => void;
  onValueTierChange: (valueTier: StaffCallValueTier) => void;
  onBirthdayChange: (birthday: StaffCallOccasionFilter) => void;
  onAnniversaryChange: (anniversary: StaffCallOccasionFilter) => void;
  onToggleAdvancedFilters: () => void;
  onClearAdvancedFilters: () => void;
}

export function StaffCallFilterPanel({
  copy,
  year,
  month,
  segment,
  valueTier,
  queue,
  master,
  birthday,
  anniversary,
  showAdvancedFilters,
  hasAdvancedFilters,
  activeAdvancedCount,
  customersCountLabel,
  yearOptions,
  getMonthCount,
  getFilterCount,
  onYearChange,
  onMonthChange,
  onMasterChange,
  onQueueChange,
  onSegmentChange,
  onValueTierChange,
  onBirthdayChange,
  onAnniversaryChange,
  onToggleAdvancedFilters,
  onClearAdvancedFilters,
}: StaffCallFilterPanelProps) {
  return (
    <div className="min-w-0 space-y-3">
      <YearMonthFilters
        variant="compact"
        year={year}
        month={month}
        yearLabel={copy.yearLabel}
        monthLabels={copy.monthLabels}
        yearOptions={yearOptions}
        scrollMonths
        getMonthCount={getMonthCount}
        onYearChange={onYearChange}
        onMonthChange={onMonthChange}
      />

      <div className="min-w-0 space-y-3 rounded-xl border border-border bg-surface-card px-3 py-3 shadow-sm sm:px-4">
        <ScrollableFilterRow
          label={copy.masterFilterLabel}
          options={copy.masters}
          value={master}
          onChange={(key) => onMasterChange(key as StaffCallMasterFilter)}
          getCount={(key) => getFilterCount("masters", key)}
        />
        <div className="border-t border-border/50" />
        <ScrollableFilterRow
          label={copy.queueLabel}
          options={copy.queues}
          value={queue}
          onChange={(key) => onQueueChange(key as StaffCallQueue)}
          getCount={(key) => getFilterCount("queues", key)}
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="min-w-0 text-sm text-text-muted">{customersCountLabel ?? ""}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            "h-8 shrink-0 gap-2 self-start rounded-full text-xs sm:self-auto",
            hasAdvancedFilters &&
              "border-brand-gold/40 bg-brand-gold/5 text-brand-gold hover:bg-brand-gold/10",
          )}
          onClick={onToggleAdvancedFilters}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
          {copy.moreFilters}
          {hasAdvancedFilters && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-gold text-[10px] font-semibold text-white">
              {activeAdvancedCount}
            </span>
          )}
        </Button>
      </div>

      {showAdvancedFilters && (
        <div className="min-w-0 space-y-3 rounded-xl border border-border bg-surface-card px-3 py-3 shadow-sm sm:px-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-text-primary">{copy.moreFilters}</p>
            {hasAdvancedFilters && (
              <button
                type="button"
                onClick={onClearAdvancedFilters}
                className="flex items-center gap-1 text-xs text-text-muted transition-colors hover:text-status-error"
              >
                <X className="h-3 w-3" aria-hidden />
                Clear
              </button>
            )}
          </div>
          <ScrollableFilterRow
            label={copy.segmentLabel}
            options={copy.segments}
            value={segment}
            onChange={(key) => onSegmentChange(key as StaffCallSegment)}
            getCount={(key) => getFilterCount("segments", key)}
          />
          <div className="border-t border-border/50" />
          <ScrollableFilterRow
            label={copy.valueTierLabel}
            options={copy.valueTiers}
            value={valueTier}
            onChange={(key) => onValueTierChange(key as StaffCallValueTier)}
            getCount={(key) => getFilterCount("valueTiers", key)}
          />
          <div className="border-t border-border/50" />
          <ScrollableFilterRow
            label={copy.birthdayLabel}
            options={copy.birthdays}
            value={birthday}
            onChange={(key) => onBirthdayChange(key as StaffCallOccasionFilter)}
            getCount={(key) => getFilterCount("birthdays", key)}
          />
          <div className="border-t border-border/50" />
          <ScrollableFilterRow
            label={copy.anniversaryLabel}
            options={copy.anniversaries}
            value={anniversary}
            onChange={(key) => onAnniversaryChange(key as StaffCallOccasionFilter)}
            getCount={(key) => getFilterCount("anniversaries", key)}
          />
        </div>
      )}
    </div>
  );
}

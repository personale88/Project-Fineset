"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Bell, Cake, Heart, PhoneOutgoing } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { content } from "@/content/en";
import { useBusinessOwnerStoreNotifications } from "@/hooks/useBusinessOwnerStoreNotifications";
import { BUSINESS_OWNER_DASHBOARD_PATH } from "@/lib/auth/routes";
import { defaultStaffCallsParams } from "@/lib/query/initial-data";
import {
  type StaffMissedSummary,
} from "@/lib/services/store-dashboard-notifications.types";
import { cn } from "@/lib/utils";
import { buildStaffCallsSearchParams } from "@/lib/utils/staff-calls-url";
import type { GetStaffCallsParams } from "@/types";
import type { LucideIcon } from "lucide-react";

type OverdueFilter = "calls" | "birthdays" | "anniversaries";

const FILTER_OPTIONS: readonly {
  key: OverdueFilter;
  labelKey: keyof typeof content.dashboardNotifications.businessOwner.filters;
  icon: LucideIcon;
}[] = [
  { key: "calls", labelKey: "calls", icon: PhoneOutgoing },
  { key: "birthdays", labelKey: "birthdays", icon: Cake },
  { key: "anniversaries", labelKey: "anniversaries", icon: Heart },
];

function ownerCallsHref(
  storeId: string,
  overrides: Partial<GetStaffCallsParams>,
): string {
  const params = {
    ...defaultStaffCallsParams(),
    storeId,
    ...overrides,
  };
  const qs = buildStaffCallsSearchParams(params);
  return `${BUSINESS_OWNER_DASHBOARD_PATH}/calls?${qs}`;
}

function matchesFilter(item: StaffMissedSummary, filter: OverdueFilter): boolean {
  switch (filter) {
    case "calls":
      return item.missedCalls > 0;
    case "birthdays":
      return item.missedBirthdays > 0;
    case "anniversaries":
      return item.missedAnniversaries > 0;
  }
}

function countForFilter(item: StaffMissedSummary, filter: OverdueFilter): number {
  switch (filter) {
    case "calls":
      return item.missedCalls;
    case "birthdays":
      return item.missedBirthdays;
    case "anniversaries":
      return item.missedAnniversaries;
  }
}

function categoryTotal(
  items: StaffMissedSummary[],
  filter: OverdueFilter,
): number {
  return items.reduce((sum, item) => sum + countForFilter(item, filter), 0);
}

function itemHref(item: StaffMissedSummary, filter: OverdueFilter): string {
  switch (filter) {
    case "calls":
      return ownerCallsHref(item.storeId, {});
    case "birthdays":
      return ownerCallsHref(item.storeId, { birthday: "THIS_MONTH" });
    case "anniversaries":
      return ownerCallsHref(item.storeId, { anniversary: "THIS_MONTH" });
  }
}

function itemIcon(filter: OverdueFilter): LucideIcon {
  switch (filter) {
    case "calls":
      return PhoneOutgoing;
    case "birthdays":
      return Cake;
    case "anniversaries":
      return Heart;
  }
}

function formatOverdueDescription(
  item: StaffMissedSummary,
  filter: OverdueFilter,
  copy: (typeof content)["dashboardNotifications"]["businessOwner"]["overdueDetail"],
): string {
  switch (filter) {
    case "calls":
      return copy.calls.replace("{count}", String(item.missedCalls));
    case "birthdays":
      return copy.birthdays.replace("{count}", String(item.missedBirthdays));
    case "anniversaries":
      return copy.anniversaries.replace("{count}", String(item.missedAnniversaries));
  }
}

export function BusinessOwnerStoreNotifications() {
  const ownerCopy = content.dashboardNotifications.businessOwner;
  const filterCopy = ownerCopy.filters;
  const { data, isLoading, isError } = useBusinessOwnerStoreNotifications();
  const items = data?.data ?? [];
  const [activeFilter, setActiveFilter] = useState<OverdueFilter | null>(null);

  const filteredItems = useMemo(
    () =>
      activeFilter === null
        ? []
        : items.filter((item) => matchesFilter(item, activeFilter)),
    [activeFilter, items],
  );

  const filterOptions = FILTER_OPTIONS.map((option) => ({
    key: option.key,
    label: filterCopy[option.labelKey],
    icon: option.icon,
    count: categoryTotal(items, option.key),
  }));

  return (
    <section
      className="min-w-0 overflow-hidden rounded-card border border-border bg-surface-card shadow-card"
      aria-label={ownerCopy.title}
    >
      <div className="border-b border-border bg-gradient-to-br from-brand-gold/[0.07] via-transparent to-transparent px-4 py-5 sm:px-5">
        <div className="flex items-start gap-3">
          <div
            className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-card bg-brand-gold/10 ring-1 ring-brand-gold/15"
            aria-hidden
          >
            <Bell className="h-5 w-5 text-brand-gold" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg font-semibold text-text-primary sm:text-xl">
              {ownerCopy.title}
            </h2>
            <p className="mt-1 max-w-prose text-sm leading-relaxed text-text-secondary">
              {ownerCopy.subtitle}
            </p>
          </div>
        </div>

        {!isLoading ? (
          <div
            className="mt-4 grid grid-cols-3 gap-2"
            role="tablist"
            aria-label={ownerCopy.title}
          >
            {filterOptions.map((option) => {
              const isActive = activeFilter === option.key;
              const Icon = option.icon;
              return (
                <button
                  key={option.key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() =>
                    setActiveFilter(isActive ? null : option.key)
                  }
                  className={cn(
                    "flex min-h-[4.25rem] flex-col items-center justify-center gap-1.5 rounded-card border px-2 py-2.5 text-center transition-all",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/50",
                    isActive
                      ? "border-brand-gold bg-brand-gold text-white shadow-sm"
                      : "border-border bg-surface-card text-text-secondary hover:border-brand-gold/35 hover:bg-brand-gold/[0.04]",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full",
                      isActive ? "bg-white/20" : "bg-brand-gold/10",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4",
                        isActive ? "text-white" : "text-brand-gold",
                      )}
                      aria-hidden
                    />
                  </span>
                  <span
                    className={cn(
                      "text-xs font-semibold leading-tight",
                      isActive ? "text-white" : "text-text-primary",
                    )}
                  >
                    {option.label}
                  </span>
                  <span
                    className={cn(
                      "inline-flex min-w-[1.5rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums leading-none",
                      isActive
                        ? "bg-white/25 text-white"
                        : option.count > 0
                          ? "bg-status-warning/12 text-status-warning"
                          : "bg-surface-secondary text-text-muted",
                    )}
                  >
                    {option.count}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-3 gap-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-[4.25rem] rounded-card" />
            ))}
          </div>
        )}
      </div>

      {isLoading && activeFilter !== null ? (
        <div className="space-y-3 p-4 sm:p-5">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full rounded-input" />
          ))}
        </div>
      ) : isError ? (
        <p className="px-4 py-6 text-sm text-status-warning sm:px-5">{ownerCopy.loadError}</p>
      ) : !isLoading && items.length === 0 ? (
        <p className="px-4 py-6 text-sm text-text-secondary sm:px-5">{ownerCopy.empty}</p>
      ) : activeFilter === null ? (
        !isLoading ? (
          <p className="px-4 py-6 text-sm text-text-secondary sm:px-5">
            {filterCopy.selectPrompt}
          </p>
        ) : null
      ) : filteredItems.length === 0 ? (
        <p className="px-4 py-6 text-sm text-text-secondary sm:px-5">{filterCopy.empty}</p>
      ) : (
        <ul className="divide-y divide-border">
          {filteredItems.map((item) => {
            const Icon = itemIcon(activeFilter);
            const count = countForFilter(item, activeFilter);
            const description = formatOverdueDescription(
              item,
              activeFilter,
              ownerCopy.overdueDetail,
            );

            return (
              <li key={`${item.storeId}-${item.staffId}`}>
                <Link
                  href={itemHref(item, activeFilter)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3.5 transition-colors sm:px-5",
                    "hover:bg-surface-secondary/40",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/50 focus-visible:ring-inset",
                  )}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card bg-brand-gold/10 text-brand-gold">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-text-primary">
                      {item.staffName}
                    </span>
                    <span className="mt-0.5 block truncate text-sm text-text-secondary">
                      <span className="text-brand-gold">{item.storeName}</span>
                      <span className="text-text-muted">
                        {" "}
                        · {item.storeCity}, {item.storeState}
                      </span>
                    </span>
                    <span className="mt-0.5 block text-xs text-text-muted">{description}</span>
                  </span>
                  <Badge
                    variant="outline"
                    className="shrink-0 border-status-warning/30 bg-status-warning/10 font-semibold text-status-warning"
                  >
                    {count}
                  </Badge>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

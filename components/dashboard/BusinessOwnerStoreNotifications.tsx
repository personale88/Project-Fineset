"use client";

import { useMemo, useState } from "react";
import { Bell, Cake, Heart, PhoneOutgoing } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CustomerProfileDialog,
  type CustomerProfileLookup,
} from "@/components/customers/CustomerProfileDialog";
import { content } from "@/content/en";
import type { PeriodValue } from "@/components/shared/PeriodSwitcher";
import { useBusinessOwnerStoreNotifications } from "@/hooks/useBusinessOwnerStoreNotifications";
import type { OverdueAlertItem } from "@/lib/services/store-dashboard-notifications.types";
import { cn } from "@/lib/utils";
import { formatDate, maskPhone } from "@/lib/utils/formatters";
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

function categoryTotal(items: OverdueAlertItem[], filter: OverdueFilter): number {
  return items.filter((item) => item.category === filter).length;
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
  item: OverdueAlertItem,
  copy: (typeof content)["dashboardNotifications"]["businessOwner"]["overdueDetail"],
): string {
  const date = formatDate(item.missedDate);

  switch (item.reason) {
    case "FOLLOW_UP_OVERDUE":
      return copy.followUpOverdue.replace("{date}", date);
    case "NOT_ANSWERED":
      return copy.notAnswered.replace("{date}", date);
    case "OPEN_FOLLOW_UP":
      return copy.openFollowUp.replace("{date}", date);
    case "BIRTHDAY":
      return copy.birthday.replace("{date}", date);
    case "ANNIVERSARY":
      return copy.anniversary.replace("{date}", date);
  }
}

function alertProfileLookup(item: OverdueAlertItem): CustomerProfileLookup | null {
  if (!item.recordId) return null;

  if (item.masterSource === "FIELD_SALE") {
    return {
      fieldSaleId: item.recordId,
      customerName: item.customerName,
      storeId: item.storeId,
    };
  }

  return {
    visitId: item.recordId,
    customerName: item.customerName,
    storeId: item.storeId,
  };
}

export function BusinessOwnerStoreNotifications({ period }: { period: PeriodValue }) {
  const ownerCopy = content.dashboardNotifications.businessOwner;
  const filterCopy = ownerCopy.filters;
  const visitCopy = content.store.visits;
  const fieldLabels = content.visitForm.fields;
  const productLabels = fieldLabels.productsExplored.options;
  const { data, isLoading, isFetching, isError } = useBusinessOwnerStoreNotifications(period);
  const items = data?.data ?? [];
  const [activeFilter, setActiveFilter] = useState<OverdueFilter | null>(null);
  const [profileLookup, setProfileLookup] = useState<CustomerProfileLookup | null>(null);

  const filteredItems = useMemo(
    () =>
      activeFilter === null
        ? []
        : items.filter((item) => item.category === activeFilter),
    [activeFilter, items],
  );

  const loading = isLoading || isFetching;

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

        {!loading ? (
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

      {loading && activeFilter !== null ? (
        <div className="space-y-3 p-4 sm:p-5">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full rounded-input" />
          ))}
        </div>
      ) : isError ? (
        <p className="px-4 py-6 text-sm text-status-warning sm:px-5">{ownerCopy.loadError}</p>
      ) : !loading && items.length === 0 ? (
        <p className="px-4 py-6 text-sm text-text-secondary sm:px-5">{ownerCopy.empty}</p>
      ) : activeFilter === null ? (
        !loading ? (
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
            const description = formatOverdueDescription(item, ownerCopy.overdueDetail);
            const maskedPhone = item.customerPhone ? maskPhone(item.customerPhone) : null;
            const canOpenProfile = alertProfileLookup(item) !== null;

            return (
              <li key={item.id}>
                <button
                  type="button"
                  disabled={!canOpenProfile}
                  onClick={() => {
                    const lookup = alertProfileLookup(item);
                    if (lookup) setProfileLookup(lookup);
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors sm:px-5",
                    canOpenProfile
                      ? "cursor-pointer hover:bg-surface-secondary/40"
                      : "cursor-default opacity-80",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/50 focus-visible:ring-inset",
                  )}
                  aria-label={
                    canOpenProfile
                      ? `${visitCopy.customerProfile.title}: ${item.customerName}`
                      : item.customerName
                  }
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card bg-brand-gold/10 text-brand-gold">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-text-primary">
                      {item.customerName}
                    </span>
                    {maskedPhone ? (
                      <span className="mt-0.5 block truncate text-sm text-text-secondary">
                        {maskedPhone}
                      </span>
                    ) : null}
                    <span className="mt-0.5 block truncate text-sm text-text-secondary">
                      {ownerCopy.assignedTo.replace("{staff}", item.staffName)}
                      <span className="text-text-muted">
                        {" "}
                        · {item.storeName} · {item.storeCity}, {item.storeState}
                      </span>
                    </span>
                    <span className="mt-0.5 block text-xs text-text-muted">{description}</span>
                  </span>
                  <Badge
                    variant="outline"
                    className="shrink-0 border-status-warning/30 bg-status-warning/10 font-semibold text-status-warning"
                  >
                    {formatDate(item.missedDate)}
                  </Badge>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <CustomerProfileDialog
        visit={null}
        lookup={profileLookup}
        copy={visitCopy.customerProfile}
        fieldLabels={fieldLabels}
        productLabels={productLabels}
        onClose={() => setProfileLookup(null)}
      />
    </section>
  );
}

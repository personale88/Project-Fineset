"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { MapPin } from "lucide-react";
import { StoreTableRowMenu, type StoreTableRow } from "@/components/admin/StoreTableRowMenu";
import { getStoreCategoryLabel } from "@/lib/utils/store-category";
import { cn } from "@/lib/utils/cn";
import type { Content } from "@/content/en";
import type { StoreCategory } from "@/types";

type AdminStoresContent = Content["admin"]["stores"];
type AdminCategories = Content["admin"]["categories"];
type ErrorsContent = Content["errors"];
type CommonContent = Content["common"];

function subscribeDayTick(onStoreChange: () => void) {
  const id = window.setInterval(onStoreChange, 60_000);
  return () => window.clearInterval(id);
}

function getNowMs() {
  return Date.now();
}

function DetailItem({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-xs font-medium text-text-muted">{label}</dt>
      <dd className="mt-0.5 truncate text-sm text-text-primary" title={value}>
        {value}
      </dd>
    </div>
  );
}

interface StoreListCardProps {
  store: StoreTableRow;
  storesCopy: AdminStoresContent;
  categories: AdminCategories;
  common: CommonContent;
  errors: ErrorsContent;
  statusActiveLabel: string;
  statusInactiveLabel: string;
}

export function StoreListCard({
  store,
  storesCopy,
  categories,
  common,
  errors,
  statusActiveLabel,
  statusInactiveLabel,
}: StoreListCardProps) {
  const categoryLabel =
    store.category === "OTHER" && store.customCategory
      ? store.customCategory
      : getStoreCategoryLabel(store.category as StoreCategory);

  const displayValue = (value: string | null | undefined) =>
    value?.trim() ? value.trim() : "—";

  const nowMs = useSyncExternalStore(subscribeDayTick, getNowMs, () => 0);

  const purgeCountdown =
    store.deletedAt && store.purgeAt
      ? Math.max(
          0,
          Math.ceil(
            (new Date(store.purgeAt).getTime() - nowMs) / (24 * 60 * 60 * 1000),
          ),
        )
      : null;

  return (
    <article className="flex flex-col rounded-card border border-border bg-surface-card shadow-card transition-colors hover:border-brand-gold/25">
      <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
        <div className="min-w-0 flex-1">
          <Link
            href={`/admin/dashboard/stores/${store.id}`}
            prefetch={false}
            className="font-display text-lg font-semibold text-text-primary transition-colors hover:text-brand-gold"
          >
            {store.name}
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-text-secondary">
              {categoryLabel}
            </span>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium",
                store.isActive
                  ? "bg-status-success/10 text-status-success"
                  : "bg-surface-secondary text-text-muted",
              )}
            >
              {store.isActive ? statusActiveLabel : statusInactiveLabel}
            </span>
            {purgeCountdown !== null ? (
              <span className="rounded-full bg-status-warning/10 px-2.5 py-0.5 text-xs font-medium text-status-warning">
                {storesCopy.purgeCountdown.replace("{days}", String(purgeCountdown))}
              </span>
            ) : null}
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-text-muted">
            <MapPin className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">
              {store.city}
              {store.state ? `, ${store.state}` : ""}
            </span>
          </p>
        </div>
        <StoreTableRowMenu
          store={store}
          storesCopy={storesCopy}
          categories={categories}
          common={common}
          errors={errors}
        />
      </header>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-4 sm:px-5">
        <DetailItem label={storesCopy.columns.city} value={displayValue(store.city)} />
        <DetailItem label={storesCopy.modal.stateLabel} value={displayValue(store.state)} />
        <DetailItem label={storesCopy.columns.pincode} value={displayValue(store.pincode)} />
        <DetailItem
          label={storesCopy.columns.businessOwnerName}
          value={displayValue(store.businessOwnerName)}
        />
        <DetailItem
          label={storesCopy.columns.businessOwnerEmail}
          value={displayValue(store.businessOwnerEmail)}
        />
        <DetailItem
          label={storesCopy.columns.staffCount}
          value={String(store.staffCount)}
          className="col-span-2 sm:col-span-1"
        />
      </dl>
    </article>
  );
}

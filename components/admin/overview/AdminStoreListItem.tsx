"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, MapPin, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { StoreEditDialog } from "@/components/admin/StoreEditDialog";
import { getStoreCategoryLabel } from "@/lib/utils/store-category";
import { useStoreCategoryChoices } from "@/hooks/useStoreCategoryChoices";
import { formatDate } from "@/lib/utils/formatters";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Content } from "@/content/en";
import type { AdminStorePortfolioRow } from "@/types";

type AdminContent = Content["admin"];

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-text-muted">{label}</dt>
      <dd className="mt-0.5 truncate text-sm text-text-primary" title={value}>
        {value}
      </dd>
    </div>
  );
}

function displayValue(value: string | null | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

export function AdminStoreListItem({
  store,
  admin,
}: {
  store: AdminStorePortfolioRow;
  admin: AdminContent;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const { data: categoryChoices = [] } = useStoreCategoryChoices();
  const categoryLabelMap = useMemo(
    () => new Map(categoryChoices.map((choice) => [choice.name, choice.label])),
    [categoryChoices],
  );
  const labels = admin.portfolio.storeList;
  const categoryLabel = getStoreCategoryLabel(
    store.category,
    store.customCategory,
    categoryLabelMap,
  );

  return (
    <article className="rounded-card border border-border bg-surface-card transition-colors hover:border-brand-gold/30">
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
        <div className="min-w-0 flex-1">
          <Link
            href={`/admin/dashboard/accounts/${store.storeId}`}
            prefetch={false}
            className="font-display text-base font-semibold text-text-primary transition-colors hover:text-brand-gold"
          >
            {store.storeName}
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium",
                store.isActive
                  ? "bg-status-success/10 text-status-success"
                  : "bg-surface-secondary text-text-muted",
              )}
            >
              {store.isActive ? admin.table.active : admin.table.inactive}
            </span>
            <span className="rounded-full border border-border px-2 py-0.5 text-xs font-medium text-text-secondary">
              {categoryLabel}
            </span>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-text-muted">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="truncate">
              {store.city}
              {store.state ? `, ${store.state}` : ""}
            </span>
          </p>
        </div>
        <div className="flex shrink-0 items-start gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" aria-hidden />
                <span className="sr-only">Store actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setEditOpen(true)}>
                <Pencil className="mr-2 h-4 w-4" aria-hidden />
                {admin.accounts.actions.edit}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Link
            href={`/admin/dashboard/accounts/${store.storeId}`}
            prefetch={false}
            className="mt-1 inline-flex shrink-0 items-center gap-1 text-sm font-medium text-brand-gold"
          >
            {admin.overview.viewDetails}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>

      <StoreEditDialog
        storeId={store.storeId}
        open={editOpen}
        onOpenChange={setEditOpen}
        admin={admin}
      />

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-3 sm:grid-cols-3 sm:px-5">
        <DetailItem
          label={admin.accounts.columns.pincode}
          value={displayValue(store.pincode, labels.notAvailable)}
        />
        <DetailItem
          label={admin.kpis.storeManager}
          value={displayValue(store.storeManagerName, labels.notAvailable)}
        />
        <DetailItem
          label={admin.kpis.storeManagerPhone}
          value={displayValue(store.storeManagerPhone, labels.notAvailable)}
        />
        <DetailItem
          label={admin.accounts.columns.staffCount}
          value={String(store.staffCount)}
        />
        <DetailItem
          label={labels.onboarded}
          value={formatDate(store.createdAt)}
        />
        <DetailItem
          label={labels.lastUpdated}
          value={formatDate(store.updatedAt)}
        />
        <DetailItem
          label={labels.dataExpiry}
          value={
            store.dataExpiryAt
              ? formatDate(store.dataExpiryAt)
              : labels.notAvailable
          }
        />
        <DetailItem
          label={labels.renewalDue}
          value={
            store.renewalDueAt
              ? formatDate(store.renewalDueAt)
              : labels.notAvailable
          }
        />
        <DetailItem
          label={labels.ownerLastLogin}
          value={
            store.ownerLastLoginAt
              ? formatDate(store.ownerLastLoginAt)
              : labels.notAvailable
          }
        />
      </dl>
    </article>
  );
}

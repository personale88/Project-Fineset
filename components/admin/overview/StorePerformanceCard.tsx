import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { BillingRestrictedMetricArea } from "@/components/billing/BillingRestrictedOverlay";
import { formatCurrency, formatPercent } from "@/lib/utils/formatters";
import { getStoreCategoryLabel } from "@/lib/utils/store-category";
import { cn } from "@/lib/utils";
import type { StorePerformanceRow } from "@/types";

export interface StorePerformanceCardLabels {
  totalVisits: string;
  totalRevenue: string;
  conversionRate: string;
  avgTicketSize: string;
  schemesEnrolled: string;
  totalStaff: string;
  fieldSales: string;
  userCalls: string;
  storeManager: string;
  storeManagerPhone: string;
  notAvailable: string;
  active: string;
  inactive: string;
  viewDetails: string;
}

export function MetricItem({
  label,
  value,
  delta,
}: {
  label: string;
  value: string;
  delta?: number;
}) {
  return (
    <div>
      <p className="text-xs text-text-muted">{label}</p>
      <p className="mt-1 font-medium text-text-primary">{value}</p>
      {delta !== undefined && (
        <p
          className={cn(
            "mt-0.5 text-xs",
            delta >= 0 ? "text-status-success" : "text-status-error",
          )}
        >
          {delta >= 0 ? "+" : ""}
          {delta}%
        </p>
      )}
    </div>
  );
}

function ContactItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-text-muted">{label}</dt>
      <dd className="mt-0.5 truncate text-sm text-text-primary" title={value}>
        {value}
      </dd>
    </div>
  );
}

function displayContactValue(
  value: string | null | undefined,
  fallback: string,
): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

export function StorePerformanceCard({
  store,
  detailHref,
  labels,
  className,
}: {
  store: StorePerformanceRow;
  detailHref: string;
  labels: StorePerformanceCardLabels;
  className?: string;
}) {
  return (
    <Link
      href={detailHref}
      prefetch={false}
      className={cn(
        "group block rounded-card border border-border bg-surface-card shadow-card transition hover:border-brand-gold/40 hover:shadow-md",
        className,
      )}
    >
      <div className="border-b border-border px-4 py-4 sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate font-display text-lg font-semibold text-text-primary group-hover:text-brand-gold">
              {store.storeName}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-text-secondary">
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-medium",
                  store.isActive
                    ? "bg-status-success/10 text-status-success"
                    : "bg-surface-secondary text-text-muted",
                )}
              >
                {store.isActive ? labels.active : labels.inactive}
              </span>
              <span className="rounded-full border border-border px-2 py-0.5 text-xs font-medium text-text-secondary">
                {getStoreCategoryLabel(store.category)}
              </span>
            </div>
            <p className="mt-2 flex items-center gap-1 text-sm text-text-muted">
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              {store.city}, {store.state}
            </p>
          </div>
          <ArrowRight
            className="mt-1 h-4 w-4 shrink-0 text-text-muted transition group-hover:text-brand-gold"
            aria-hidden
          />
        </div>
      </div>

      <BillingRestrictedMetricArea className="px-4 py-4 sm:px-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <MetricItem
            label={labels.totalVisits}
            value={String(store.visits)}
            delta={store.deltas?.visits}
          />
          <MetricItem
            label={labels.totalRevenue}
            value={formatCurrency(store.revenue)}
            delta={store.deltas?.revenue}
          />
          <MetricItem
            label={labels.conversionRate}
            value={formatPercent(store.conversionRate)}
            delta={store.deltas?.conversionRate}
          />
          <MetricItem
            label={labels.avgTicketSize}
            value={formatCurrency(store.avgTicketSize)}
            delta={store.deltas?.avgTicketSize}
          />
          <MetricItem
            label={labels.schemesEnrolled}
            value={String(store.schemesEnrolled)}
            delta={store.deltas?.schemesEnrolled}
          />
          <MetricItem
            label={labels.fieldSales}
            value={String(store.fieldSales ?? 0)}
            delta={store.deltas?.fieldSales}
          />
          <MetricItem
            label={labels.userCalls}
            value={String(store.userCalls ?? 0)}
            delta={store.deltas?.userCalls}
          />
          <MetricItem label={labels.totalStaff} value={String(store.staffCount)} />
        </div>
      </BillingRestrictedMetricArea>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border px-4 py-4 sm:px-5">
        <ContactItem
          label={labels.storeManager}
          value={displayContactValue(store.storeManagerName, labels.notAvailable)}
        />
        <ContactItem
          label={labels.storeManagerPhone}
          value={displayContactValue(store.storeManagerPhone, labels.notAvailable)}
        />
      </dl>

      <div className="border-t border-border px-4 py-3 sm:px-5">
        <span className="text-sm font-medium text-brand-gold">
          {labels.viewDetails}
        </span>
      </div>
    </Link>
  );
}

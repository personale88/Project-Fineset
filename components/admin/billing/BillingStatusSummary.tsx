"use client";

import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { AdminPortfolioPaymentStatus } from "@/lib/utils/admin-portfolio-filters";

export type BillingPaymentFilter = "ALL" | AdminPortfolioPaymentStatus;

type Tone = "default" | "success" | "warning" | "error";

interface StatusSegment {
  key: BillingPaymentFilter;
  label: string;
  hint: string;
  count: number;
  barColor: string;
  tone: Tone;
  icon: LucideIcon;
}

interface BillingStatusSummaryProps {
  title: string;
  subtitle: string;
  allLabel: string;
  counts: Record<AdminPortfolioPaymentStatus, number>;
  totalBusinesses: number;
  activeFilter: BillingPaymentFilter;
  onFilterChange: (filter: BillingPaymentFilter) => void;
  segments: Array<{
    key: AdminPortfolioPaymentStatus;
    label: string;
    hint: string;
  }>;
  isLoading?: boolean;
}

const toneText: Record<Tone, string> = {
  default: "text-text-primary",
  success: "text-status-success",
  warning: "text-status-warning",
  error: "text-status-error",
};

const toneIconBg: Record<Tone, string> = {
  default: "bg-brand-gold/10 text-brand-gold",
  success: "bg-status-success/10 text-status-success",
  warning: "bg-status-warning/10 text-status-warning",
  error: "bg-status-error/10 text-status-error",
};

function segmentTone(key: AdminPortfolioPaymentStatus, count: number): Tone {
  if (count === 0) return "default";
  switch (key) {
    case "CURRENT":
      return "success";
    case "DUE_SOON":
      return "warning";
    case "OVERDUE":
    case "EXPIRED":
      return "error";
    default:
      return "default";
  }
}

function segmentBarColor(key: AdminPortfolioPaymentStatus): string {
  switch (key) {
    case "CURRENT":
      return "bg-status-success";
    case "DUE_SOON":
      return "bg-status-warning";
    case "OVERDUE":
      return "bg-status-error";
    case "EXPIRED":
      return "bg-status-error/70";
    default:
      return "bg-text-muted/40";
  }
}

function segmentIcon(key: AdminPortfolioPaymentStatus): LucideIcon {
  switch (key) {
    case "CURRENT":
      return CheckCircle2;
    case "DUE_SOON":
      return Clock;
    case "EXPIRED":
      return AlertTriangle;
    case "OVERDUE":
      return AlertCircle;
    default:
      return HelpCircle;
  }
}

export function BillingStatusSummary({
  title,
  subtitle,
  allLabel,
  counts,
  totalBusinesses,
  activeFilter,
  onFilterChange,
  segments,
  isLoading,
}: BillingStatusSummaryProps) {
  const statusSegments: StatusSegment[] = segments.map((segment) => ({
    ...segment,
    key: segment.key,
    count: counts[segment.key],
    barColor: segmentBarColor(segment.key),
    tone: segmentTone(segment.key, counts[segment.key]),
    icon: segmentIcon(segment.key),
  }));

  const barOrder: AdminPortfolioPaymentStatus[] = [
    "CURRENT",
    "DUE_SOON",
    "OVERDUE",
    "EXPIRED",
    "UNKNOWN",
  ];
  const barSegments = barOrder
    .map((key) => statusSegments.find((segment) => segment.key === key))
    .filter((segment): segment is StatusSegment => Boolean(segment));

  const barTotal = statusSegments.reduce((sum, segment) => sum + segment.count, 0);
  const actionCount = statusSegments
    .filter((segment) => segment.key !== "CURRENT" && segment.key !== "UNKNOWN")
    .reduce((sum, segment) => sum + segment.count, 0);

  function FilterChip({
    filterKey,
    label,
    hint,
    count,
    tone,
    icon: Icon,
    barColor,
  }: {
    filterKey: BillingPaymentFilter;
    label: string;
    hint?: string;
    count: number;
    tone: Tone;
    icon?: LucideIcon;
    barColor?: string;
  }) {
    const isActive = activeFilter === filterKey;

    return (
      <button
        type="button"
        role="tab"
        aria-selected={isActive}
        onClick={() => onFilterChange(filterKey)}
        className={cn(
          "group rounded-lg border px-3 py-2.5 text-left transition-colors",
          isActive
            ? "border-brand-gold/50 bg-brand-gold/5"
            : "border-border/70 bg-surface-secondary/30 hover:border-border hover:bg-surface-card",
        )}
      >
        <div className="flex items-center gap-2">
          {barColor ? (
            <span
              className={cn("h-2 w-2 shrink-0 rounded-full", barColor)}
              aria-hidden
            />
          ) : Icon ? (
            <span
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
                toneIconBg[tone],
              )}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
            </span>
          ) : null}
          <span className="truncate text-xs font-medium text-text-muted">{label}</span>
        </div>
        {isLoading ? (
          <Skeleton className="mt-2 h-7 w-8" />
        ) : (
          <p
            className={cn(
              "mt-1.5 font-numeric text-2xl font-bold tabular-nums leading-none",
              count > 0 && filterKey !== "ALL" ? toneText[tone] : "text-text-primary",
            )}
          >
            {count.toLocaleString("en-IN")}
          </p>
        )}
        {hint ? (
          <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-text-muted">
            {hint}
          </p>
        ) : null}
      </button>
    );
  }

  return (
    <section className="rounded-card border border-border bg-surface-card p-4 shadow-card sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-display text-sm font-semibold text-text-primary">{title}</h2>
          <p className="mt-0.5 text-xs text-text-muted">{subtitle}</p>
        </div>
        {!isLoading ? (
          <span
            className={cn(
              "inline-flex shrink-0 self-start rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
              actionCount > 0
                ? "bg-status-warning/10 text-status-warning ring-status-warning/20"
                : "bg-status-success/10 text-status-success ring-status-success/20",
            )}
          >
            {actionCount > 0
              ? `${actionCount} need${actionCount === 1 ? "s" : ""} attention`
              : "All renewals healthy"}
          </span>
        ) : null}
      </div>

      {isLoading ? (
        <Skeleton className="mt-4 h-1.5 w-full rounded-full" />
      ) : barTotal > 0 ? (
        <div
          className="mt-4 flex h-1.5 overflow-hidden rounded-full bg-surface-secondary"
          role="img"
          aria-label={`${barTotal} businesses by renewal status`}
        >
          {barSegments.map((segment) =>
            segment.count > 0 ? (
              <button
                key={segment.key}
                type="button"
                className={cn(
                  "h-full min-w-[3px] transition-[width,opacity] hover:opacity-80",
                  segment.barColor,
                  activeFilter === segment.key && "ring-1 ring-inset ring-text-primary/20",
                )}
                style={{ width: `${(segment.count / barTotal) * 100}%` }}
                title={`${segment.label}: ${segment.count}`}
                onClick={() => onFilterChange(segment.key)}
                aria-label={`Filter ${segment.label}, ${segment.count} businesses`}
              />
            ) : null,
          )}
        </div>
      ) : (
        <p className="mt-4 text-sm text-text-muted">No businesses in portfolio yet.</p>
      )}

      <div
        className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6"
        role="tablist"
        aria-label="Filter by renewal status"
      >
        <FilterChip
          filterKey="ALL"
          label={allLabel}
          count={totalBusinesses}
          tone="default"
          icon={CheckCircle2}
        />
        {statusSegments.map((segment) => (
          <FilterChip
            key={segment.key}
            filterKey={segment.key}
            label={segment.label}
            hint={segment.hint}
            count={segment.count}
            tone={segment.tone}
            barColor={segment.barColor}
          />
        ))}
      </div>
    </section>
  );
}

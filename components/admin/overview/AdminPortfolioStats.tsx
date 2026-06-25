"use client";

import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  Activity,
  ArrowRight,
  CalendarClock,
  Clock,
  PhoneOff,
  TrendingDown,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/formatters";
import type { AdminPortfolioKpis } from "@/lib/utils/admin-portfolio-kpis";
import type { AdminPortfolioGrowthMetrics } from "@/lib/services/admin-portfolio-growth";
import type { Content } from "@/content/en";

type DashboardCopy = Content["admin"]["portfolio"]["dashboard"];

type Tone = "default" | "success" | "warning" | "error";

const toneText: Record<Tone, string> = {
  default: "text-text-primary",
  success: "text-status-success",
  warning: "text-status-warning",
  error: "text-status-error",
};

const toneBg: Record<Tone, string> = {
  default: "bg-brand-gold/10 text-brand-gold",
  success: "bg-status-success/10 text-status-success",
  warning: "bg-status-warning/10 text-status-warning",
  error: "bg-status-error/10 text-status-error",
};

function PortfolioHero({
  copy,
  kpis,
  isLoading,
}: {
  copy: DashboardCopy;
  kpis: AdminPortfolioKpis;
  isLoading?: boolean;
}) {
  const quickStats = [
    {
      label: copy.hero.businesses,
      value: kpis.totalBusinesses.toLocaleString("en-IN"),
      hint: copy.hero.businessesHint,
    },
    {
      label: copy.hero.stores,
      value: kpis.totalStores.toLocaleString("en-IN"),
      hint: `${kpis.activeStores} active · ${kpis.totalStaff} staff`,
    },
    {
      label: copy.revenue.atRiskMrr,
      value: formatCurrency(kpis.atRiskMrr),
      hint: copy.revenue.atRiskMrrHint,
      tone: kpis.atRiskMrr > 0 ? ("error" as const) : ("default" as const),
    },
  ];

  return (
    <section className="overflow-hidden rounded-card border border-border bg-surface-card shadow-card">
      <div className="border-b border-border bg-gradient-to-br from-brand-gold/8 via-surface-card to-surface-card px-5 py-6 sm:px-6 sm:py-7">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
              {copy.revenue.mrr}
            </p>
            {isLoading ? (
              <Skeleton className="mt-2 h-12 w-48 sm:h-14 sm:w-56" />
            ) : (
              <p className="mt-1 font-numeric text-4xl font-bold tabular-nums leading-none text-text-primary sm:text-5xl">
                {formatCurrency(kpis.mrr)}
              </p>
            )}
            <p className="mt-2 max-w-md text-sm text-text-secondary">
              {copy.revenue.mrrHint}
              {!isLoading ? (
                <span className="text-text-muted">
                  {" "}
                  · {formatCurrency(kpis.avgRevenuePerBusiness)} avg / business
                </span>
              ) : null}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:gap-4">
            {quickStats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-lg border border-border/80 bg-surface-card/80 px-3 py-2.5 backdrop-blur-sm"
              >
                <p className="truncate text-[11px] font-medium uppercase tracking-wide text-text-muted">
                  {stat.label}
                </p>
                {isLoading ? (
                  <Skeleton className="mt-1.5 h-6 w-16" />
                ) : (
                  <p
                    className={cn(
                      "mt-0.5 font-numeric text-lg font-bold tabular-nums leading-tight",
                      stat.tone ? toneText[stat.tone] : "text-text-primary",
                    )}
                  >
                    {stat.value}
                  </p>
                )}
                <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-text-muted">
                  {stat.hint}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function SubscriptionHealthBar({
  copy,
  paymentLabels,
  paymentHints,
  counts,
  isLoading,
}: {
  copy: DashboardCopy;
  paymentLabels: AdminPortfolioStatsProps["paymentLabels"];
  paymentHints: AdminPortfolioStatsProps["paymentHints"];
  counts: AdminPortfolioKpis["paymentStatusCounts"];
  isLoading?: boolean;
}) {
  const segments = [
    {
      key: "CURRENT" as const,
      label: paymentLabels.current,
      count: counts.CURRENT,
      color: "bg-status-success",
      hint: paymentHints.current,
    },
    {
      key: "DUE_SOON" as const,
      label: paymentLabels.dueSoon,
      count: counts.DUE_SOON,
      color: "bg-status-warning",
      hint: paymentHints.dueSoon,
    },
    {
      key: "OVERDUE" as const,
      label: paymentLabels.overdue,
      count: counts.OVERDUE,
      color: "bg-status-error",
      hint: paymentHints.overdue,
    },
    {
      key: "EXPIRED" as const,
      label: paymentLabels.expired,
      count: counts.EXPIRED,
      color: "bg-status-error/70",
      hint: paymentHints.expired,
    },
    {
      key: "UNKNOWN" as const,
      label: paymentLabels.unknown,
      count: counts.UNKNOWN,
      color: "bg-text-muted/40",
      hint: paymentHints.unknown,
    },
  ];

  const total = segments.reduce((sum, segment) => sum + segment.count, 0);

  return (
    <section className="rounded-card border border-border bg-surface-card p-4 shadow-card sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-display text-sm font-semibold text-text-primary">
            {copy.subscription.title}
          </h2>
          <p className="mt-0.5 text-xs text-text-muted">{copy.subscription.subtitle}</p>
        </div>
        <Link
          href="/admin/dashboard/billing"
          className="inline-flex items-center gap-1 text-xs font-medium text-brand-gold hover:underline"
        >
          View billing
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>

      {isLoading ? (
        <Skeleton className="mt-4 h-1.5 w-full rounded-full" />
      ) : total > 0 ? (
        <div
          className="mt-4 flex h-1.5 overflow-hidden rounded-full bg-surface-secondary"
          role="img"
          aria-label={`${total} businesses by subscription status`}
        >
          {segments.map((segment) =>
            segment.count > 0 ? (
              <div
                key={segment.key}
                className={cn("h-full min-w-[2px] transition-[width]", segment.color)}
                style={{ width: `${(segment.count / total) * 100}%` }}
                title={`${segment.label}: ${segment.count}`}
              />
            ) : null,
          )}
        </div>
      ) : (
        <p className="mt-4 text-sm text-text-muted">No businesses in portfolio yet.</p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {segments.map((segment) => (
          <div
            key={segment.key}
            className="rounded-lg border border-border/70 bg-surface-secondary/40 px-3 py-2"
          >
            <div className="flex items-center gap-2">
              <span
                className={cn("h-2 w-2 shrink-0 rounded-full", segment.color)}
                aria-hidden
              />
              <span className="truncate text-xs text-text-muted">{segment.label}</span>
            </div>
            {isLoading ? (
              <Skeleton className="mt-1.5 h-6 w-8" />
            ) : (
              <p className="mt-1 font-numeric text-xl font-bold tabular-nums text-text-primary">
                {segment.count}
              </p>
            )}
            <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-text-muted">
              {segment.hint}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function AttentionPanel({
  copy,
  kpis,
  growth,
  isLoading,
  isGrowthLoading,
}: {
  copy: DashboardCopy;
  kpis: AdminPortfolioKpis;
  growth?: AdminPortfolioGrowthMetrics;
  isLoading?: boolean;
  isGrowthLoading?: boolean;
}) {
  const items = [
    {
      label: copy.actions.unpaidAccounts,
      value: kpis.unpaidBillingCount,
      tone: kpis.unpaidBillingCount > 0 ? ("error" as const) : ("default" as const),
      href: "/admin/dashboard/billing",
      icon: AlertCircle,
    },
    {
      label: copy.actions.followUpsDue,
      value: kpis.followUpsDueCount,
      tone: kpis.followUpsDueCount > 0 ? ("warning" as const) : ("default" as const),
      href: "/admin/dashboard/billing",
      icon: CalendarClock,
    },
    {
      label: copy.actions.dormantBusinesses,
      value: growth?.dormantBusinessCount ?? 0,
      tone:
        (growth?.dormantBusinessCount ?? 0) > 0 ? ("error" as const) : ("default" as const),
      href: "/admin/dashboard/accounts",
      icon: AlertTriangle,
      loading: isGrowthLoading,
    },
    {
      label: copy.actions.missingContact,
      value: kpis.missingContactCount,
      tone: kpis.missingContactCount > 0 ? ("warning" as const) : ("default" as const),
      href: "/admin/dashboard/accounts",
      icon: PhoneOff,
    },
    {
      label: copy.actions.staleLogin,
      value: kpis.staleOwnerLoginCount,
      tone: kpis.staleOwnerLoginCount > 0 ? ("warning" as const) : ("default" as const),
      href: "/admin/dashboard/accounts",
      icon: Users,
    },
    {
      label: copy.actions.usageDrop,
      value: growth?.usageDropStoreCount ?? 0,
      tone:
        (growth?.usageDropStoreCount ?? 0) > 0 ? ("warning" as const) : ("default" as const),
      href: "/admin/dashboard/accounts",
      icon: TrendingDown,
      loading: isGrowthLoading,
    },
  ];

  const alertCount = items.filter((item) => item.value > 0).length;

  return (
    <section
      className={cn(
        "rounded-card border p-4 shadow-card sm:p-5",
        alertCount > 0
          ? "border-status-warning/30 bg-status-warning/5"
          : "border-border bg-surface-card",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-sm font-semibold text-text-primary">
            {copy.actions.title}
          </h2>
          <p className="mt-0.5 text-xs text-text-muted">{copy.actions.subtitle}</p>
        </div>
        {!isLoading && !isGrowthLoading ? (
          <span
            className={cn(
              "inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
              alertCount > 0
                ? "bg-status-warning/10 text-status-warning ring-status-warning/20"
                : "bg-status-success/10 text-status-success ring-status-success/20",
            )}
          >
            {alertCount > 0 ? `${alertCount} open` : "All clear"}
          </span>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {items.map((item) => {
          const Icon = item.icon;
          const cardClassName = cn(
            "group rounded-lg border px-3 py-2.5 transition-colors",
            item.value > 0
              ? "border-border bg-surface-card hover:border-brand-gold/40 hover:bg-brand-gold/5"
              : "border-transparent bg-surface-secondary/30",
          );
          const cardBody = (
            <>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                    item.value > 0 ? toneBg[item.tone] : "bg-surface-secondary text-text-muted",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1 truncate text-xs text-text-muted">
                  {item.label}
                </span>
              </div>
              {isLoading || item.loading ? (
                <Skeleton className="mt-2 h-7 w-10" />
              ) : (
                <p
                  className={cn(
                    "mt-2 font-numeric text-2xl font-bold tabular-nums leading-none",
                    item.value > 0 ? toneText[item.tone] : "text-text-primary",
                  )}
                >
                  {item.value.toLocaleString("en-IN")}
                </p>
              )}
            </>
          );

          if (item.value > 0) {
            return (
              <Link key={item.label} href={item.href} className={cardClassName}>
                {cardBody}
              </Link>
            );
          }

          return (
            <div key={item.label} className={cardClassName}>
              {cardBody}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function MetricPanel({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-card border border-border bg-surface-card p-4 shadow-card sm:p-5",
        className,
      )}
    >
      <div className="mb-4">
        <h2 className="font-display text-sm font-semibold text-text-primary">{title}</h2>
        {subtitle ? (
          <p className="mt-0.5 text-xs text-text-muted">{subtitle}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function CompactMetric({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  isLoading,
}: {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  tone?: Tone;
  isLoading?: boolean;
}) {
  return (
    <div className="flex gap-3 rounded-lg border border-border/60 bg-surface-secondary/30 p-3">
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
          toneBg[tone],
        )}
        aria-hidden
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-text-muted">{label}</p>
        {isLoading ? (
          <Skeleton className="mt-1.5 h-7 w-16" />
        ) : (
          <p
            className={cn(
              "mt-0.5 font-numeric text-xl font-bold tabular-nums leading-tight",
              toneText[tone],
            )}
          >
            {value}
          </p>
        )}
        <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-text-muted">{hint}</p>
      </div>
    </div>
  );
}

interface AdminPortfolioStatsProps {
  copy: DashboardCopy;
  paymentLabels: {
    overdue: string;
    dueSoon: string;
    expired: string;
    current: string;
    unknown: string;
  };
  paymentHints: {
    overdue: string;
    dueSoon: string;
    expired: string;
    current: string;
    unknown: string;
  };
  kpis: AdminPortfolioKpis;
  growth?: AdminPortfolioGrowthMetrics;
  isLoading?: boolean;
  isGrowthLoading?: boolean;
}

export function AdminPortfolioStats({
  copy,
  paymentLabels,
  paymentHints,
  kpis,
  growth,
  isLoading,
  isGrowthLoading,
}: AdminPortfolioStatsProps) {
  const growthLoading = isLoading || isGrowthLoading;

  return (
    <div className="space-y-6">
      <PortfolioHero
        copy={copy}
        kpis={kpis}
        isLoading={isLoading}
      />

      <SubscriptionHealthBar
        copy={copy}
        paymentLabels={paymentLabels}
        paymentHints={paymentHints}
        counts={kpis.paymentStatusCounts}
        isLoading={isLoading}
      />

      <AttentionPanel
        copy={copy}
        kpis={kpis}
        growth={growth}
        isLoading={isLoading}
        isGrowthLoading={isGrowthLoading}
      />

      <MetricPanel title={copy.adoption.title} subtitle={copy.adoption.subtitle}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <CompactMetric
            label={copy.adoption.activeStores30d}
            value={growth ? `${growth.activeStoreUsageRate}%` : "—"}
            hint={
              growth
                ? copy.adoption.activeStores30dHint
                    .replace("{active}", String(growth.activeStores30d))
                    .replace("{total}", String(kpis.totalStores))
                : copy.adoption.activeStores30dHint
                    .replace("{active}", "—")
                    .replace("{total}", String(kpis.totalStores))
            }
            icon={Activity}
            tone={
              growth && growth.activeStoreUsageRate < 50 ? "warning" : "success"
            }
            isLoading={growthLoading}
          />
          <CompactMetric
            label={copy.adoption.weeklyActiveOwners}
            value={growth ? `${growth.weeklyActiveOwnerRate}%` : "—"}
            hint={
              growth
                ? copy.adoption.weeklyActiveOwnersHint
                    .replace("{active}", String(growth.weeklyActiveOwners))
                    .replace("{total}", String(growth.totalBusinessOwners))
                : "—"
            }
            icon={Users}
            isLoading={growthLoading}
          />
          <CompactMetric
            label={copy.adoption.avgDaysToFirstVisit}
            value={
              growth?.avgDaysToFirstVisit != null
                ? String(growth.avgDaysToFirstVisit)
                : "—"
            }
            hint={
              growth?.avgDaysToFirstVisit != null
                ? copy.adoption.avgDaysToFirstVisitHint
                : copy.adoption.avgDaysToFirstVisitEmpty
            }
            icon={Clock}
            isLoading={growthLoading}
          />
          <CompactMetric
            label={copy.adoption.activationRate}
            value={growth ? `${growth.activationRate14d}%` : "—"}
            hint={copy.adoption.activationRateHint}
            icon={TrendingUp}
            tone={
              growth && growth.activationRate14d >= 60 ? "success" : "warning"
            }
            isLoading={growthLoading}
          />
        </div>
      </MetricPanel>
    </div>
  );
}

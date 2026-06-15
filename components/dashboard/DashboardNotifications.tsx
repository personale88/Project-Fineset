"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Bell,
  Cake,
  CalendarClock,
  Heart,
  PhoneCall,
  PhoneMissed,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { content } from "@/content/en";
import { useFollowUps } from "@/hooks/useFollowUps";
import { useStaffCallFilterCounts, useStaffCalls } from "@/hooks/useStaffCalls";
import {
  STAFF_DASHBOARD_PATH,
  STORE_MANAGER_DASHBOARD_PATH,
} from "@/lib/auth/routes";
import { defaultStaffCallsParams } from "@/lib/query/initial-data";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils/formatters";
import { buildStaffCallsSearchParams } from "@/lib/utils/staff-calls-url";
import type {
  FollowUpListItem,
  GetStaffCallsParams,
  StaffCallFilterCounts,
  StaffCallListItem,
} from "@/types";
import type { LucideIcon } from "lucide-react";

interface DashboardNotificationsProps {
  variant: "staff" | "store_manager";
  storeId?: string;
}

type NotificationFilter =
  | "overdue_follow_ups"
  | "due_today_follow_ups"
  | "follow_up_calls"
  | "not_answered_calls"
  | "birthdays"
  | "anniversaries";

type CategoryKind = "follow_ups" | "calls";

interface CategoryConfig {
  key: NotificationFilter;
  title: string;
  icon: LucideIcon;
  urgent?: boolean;
  kind: CategoryKind;
  href: (basePath: string) => string;
  callParams?: Partial<GetStaffCallsParams>;
}

function countFromFilters(
  filters: StaffCallFilterCounts | undefined,
  group: "queues" | "birthdays" | "anniversaries",
  key: string,
): number {
  return filters?.[group].find((item) => item.key === key)?.count ?? 0;
}

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function isOverdueFollowUp(followUpDate: string): boolean {
  return new Date(followUpDate) < startOfDay(new Date());
}

function isDueTodayFollowUp(followUpDate: string): boolean {
  const due = new Date(followUpDate);
  const today = new Date();
  return (
    due.getFullYear() === today.getFullYear() &&
    due.getMonth() === today.getMonth() &&
    due.getDate() === today.getDate()
  );
}

function callsHref(
  basePath: string,
  overrides: Partial<GetStaffCallsParams>,
): string {
  const params = { ...defaultStaffCallsParams(), ...overrides };
  const qs = buildStaffCallsSearchParams(params);
  return qs ? `${basePath}?${qs}` : basePath;
}

export function DashboardNotifications({
  variant,
  storeId,
}: DashboardNotificationsProps) {
  const copy = content.dashboardNotifications;
  const filterCopy = copy.filters;
  const callParams = useMemo(
    () => ({
      ...defaultStaffCallsParams(),
      ...(storeId ? { storeId } : {}),
    }),
    [storeId],
  );

  const { data: openFollowUps, isLoading: followUpsLoading } = useFollowUps({
    ...(variant === "store_manager" && storeId ? { storeId } : {}),
    status: "OPEN",
  });
  const { data: filterCounts, isLoading: filtersLoading } =
    useStaffCallFilterCounts(callParams);

  const [activeFilter, setActiveFilter] = useState<NotificationFilter | null>(null);

  const callsBasePath =
    variant === "staff"
      ? `${STAFF_DASHBOARD_PATH}/calls`
      : `${STORE_MANAGER_DASHBOARD_PATH}/my-calls`;

  const followUpsHref =
    variant === "staff"
      ? `${STAFF_DASHBOARD_PATH}/follow-ups`
      : `${STORE_MANAGER_DASHBOARD_PATH}/calls`;

  const followUps = openFollowUps ?? [];
  const overdueFollowUps = useMemo(
    () => followUps.filter((item) => isOverdueFollowUp(item.followUpDate)),
    [followUps],
  );
  const dueTodayFollowUps = useMemo(
    () => followUps.filter((item) => isDueTodayFollowUp(item.followUpDate)),
    [followUps],
  );

  const activeCategory = useMemo((): CategoryConfig | null => {
    if (!activeFilter) return null;

    const configs: Record<NotificationFilter, CategoryConfig> = {
      overdue_follow_ups: {
        key: "overdue_follow_ups",
        title: copy.overdueFollowUps.title,
        icon: CalendarClock,
        urgent: true,
        kind: "follow_ups",
        href: () => followUpsHref,
      },
      due_today_follow_ups: {
        key: "due_today_follow_ups",
        title: copy.dueTodayFollowUps.title,
        icon: CalendarClock,
        kind: "follow_ups",
        href: () => followUpsHref,
      },
      follow_up_calls: {
        key: "follow_up_calls",
        title: copy.followUpCalls.title,
        icon: PhoneCall,
        kind: "calls",
        href: (base) => callsHref(base, { queue: "FOLLOW_UP" }),
        callParams: { queue: "FOLLOW_UP" },
      },
      not_answered_calls: {
        key: "not_answered_calls",
        title: copy.notAnsweredCalls.title,
        icon: PhoneMissed,
        urgent: true,
        kind: "calls",
        href: (base) => callsHref(base, { queue: "NOT_ANSWERED" }),
        callParams: { queue: "NOT_ANSWERED" },
      },
      birthdays: {
        key: "birthdays",
        title: copy.birthdays.title,
        icon: Cake,
        kind: "calls",
        href: (base) => callsHref(base, { birthday: "THIS_MONTH" }),
        callParams: { birthday: "THIS_MONTH" },
      },
      anniversaries: {
        key: "anniversaries",
        title: copy.anniversaries.title,
        icon: Heart,
        kind: "calls",
        href: (base) => callsHref(base, { anniversary: "THIS_MONTH" }),
        callParams: { anniversary: "THIS_MONTH" },
      },
    };

    return configs[activeFilter];
  }, [activeFilter, copy, followUpsHref]);

  const activeCallParams = useMemo(() => {
    if (!activeCategory?.callParams) return null;
    return {
      ...callParams,
      ...activeCategory.callParams,
      page: 1,
      pageSize: 8,
    };
  }, [activeCategory, callParams]);

  const { data: callsData, isLoading: callsListLoading } = useStaffCalls(
    activeCallParams ?? callParams,
    { enabled: activeCallParams !== null },
  );

  const countsLoading = followUpsLoading || filtersLoading;

  const filterOptions = useMemo(() => {
    const options: Array<{
      key: NotificationFilter;
      label: string;
      icon: LucideIcon;
      count: number;
      urgent?: boolean;
    }> = [];

    if (overdueFollowUps.length > 0) {
      options.push({
        key: "overdue_follow_ups",
        label: copy.overdueFollowUps.title,
        icon: CalendarClock,
        count: overdueFollowUps.length,
        urgent: true,
      });
    }
    if (dueTodayFollowUps.length > 0) {
      options.push({
        key: "due_today_follow_ups",
        label: copy.dueTodayFollowUps.title,
        icon: CalendarClock,
        count: dueTodayFollowUps.length,
      });
    }

    const followUpCallCount = countFromFilters(filterCounts, "queues", "FOLLOW_UP");
    if (followUpCallCount > 0) {
      options.push({
        key: "follow_up_calls",
        label: copy.followUpCalls.title,
        icon: PhoneCall,
        count: followUpCallCount,
      });
    }

    const notAnsweredCount = countFromFilters(filterCounts, "queues", "NOT_ANSWERED");
    if (notAnsweredCount > 0) {
      options.push({
        key: "not_answered_calls",
        label: copy.notAnsweredCalls.title,
        icon: PhoneMissed,
        count: notAnsweredCount,
        urgent: true,
      });
    }

    const birthdayCount = countFromFilters(filterCounts, "birthdays", "THIS_MONTH");
    if (birthdayCount > 0) {
      options.push({
        key: "birthdays",
        label: copy.birthdays.title,
        icon: Cake,
        count: birthdayCount,
      });
    }

    const anniversaryCount = countFromFilters(filterCounts, "anniversaries", "THIS_MONTH");
    if (anniversaryCount > 0) {
      options.push({
        key: "anniversaries",
        label: copy.anniversaries.title,
        icon: Heart,
        count: anniversaryCount,
      });
    }

    return options;
  }, [copy, dueTodayFollowUps.length, filterCounts, overdueFollowUps.length]);

  const listLoading =
    activeFilter === null
      ? false
      : activeCategory?.kind === "calls"
        ? callsListLoading
        : followUpsLoading;

  const listItems = useMemo((): Array<
    | { type: "follow_up"; item: FollowUpListItem }
    | { type: "call"; item: StaffCallListItem }
  > => {
    if (!activeFilter) return [];

    if (activeFilter === "overdue_follow_ups") {
      return overdueFollowUps.map((item) => ({ type: "follow_up" as const, item }));
    }
    if (activeFilter === "due_today_follow_ups") {
      return dueTodayFollowUps.map((item) => ({ type: "follow_up" as const, item }));
    }

    return (callsData?.data ?? []).map((item) => ({ type: "call" as const, item }));
  }, [
    activeFilter,
    callsData?.data,
    dueTodayFollowUps,
    overdueFollowUps,
  ]);

  const viewAllHref = activeCategory?.href(callsBasePath) ?? callsBasePath;
  const activeTotal =
    activeFilter === "overdue_follow_ups"
      ? overdueFollowUps.length
      : activeFilter === "due_today_follow_ups"
        ? dueTodayFollowUps.length
        : activeCategory?.kind === "calls"
          ? (callsData?.total ?? 0)
          : 0;

  return (
    <section
      className="min-w-0 overflow-hidden rounded-card border border-border bg-surface-card shadow-card"
      aria-label={copy.title}
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
              {copy.title}
            </h2>
          </div>
        </div>

        {countsLoading ? (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-[4.25rem] rounded-card" />
            ))}
          </div>
        ) : filterOptions.length === 0 ? (
          <p className="mt-4 text-sm text-text-secondary">{copy.empty}</p>
        ) : (
          <div
            className={cn(
              "mt-4 grid gap-2",
              filterOptions.length <= 2
                ? "grid-cols-2"
                : filterOptions.length === 3
                  ? "grid-cols-3"
                  : "grid-cols-2 sm:grid-cols-3",
            )}
            role="tablist"
            aria-label={copy.title}
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
                      isActive
                        ? "bg-white/20"
                        : option.urgent
                          ? "bg-status-warning/15"
                          : "bg-brand-gold/10",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4",
                        isActive
                          ? "text-white"
                          : option.urgent
                            ? "text-status-warning"
                            : "text-brand-gold",
                      )}
                      aria-hidden
                    />
                  </span>
                  <span
                    className={cn(
                      "line-clamp-2 text-xs font-semibold leading-tight",
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
                        : option.urgent
                          ? "bg-status-warning/12 text-status-warning"
                          : option.count > 0
                            ? "bg-brand-gold/10 text-brand-gold"
                            : "bg-surface-secondary text-text-muted",
                    )}
                  >
                    {option.count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {activeFilter !== null && filterOptions.length > 0 ? (
        listLoading ? (
          <div className="space-y-3 p-4 sm:p-5">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-14 w-full rounded-input" />
            ))}
          </div>
        ) : listItems.length === 0 ? (
          <p className="px-4 py-6 text-sm text-text-secondary sm:px-5">{filterCopy.empty}</p>
        ) : (
          <>
            <ul className="divide-y divide-border">
              {listItems.map((entry) => {
                if (entry.type === "follow_up") {
                  const item = entry.item;
                  return (
                    <li key={item.id}>
                      <Link
                        href={followUpsHref}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3.5 transition-colors sm:px-5",
                          "hover:bg-surface-secondary/40",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/50 focus-visible:ring-inset",
                        )}
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card bg-brand-gold/10 text-brand-gold">
                          <CalendarClock className="h-4 w-4" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-text-primary">
                            {item.customerName}
                          </span>
                          <span className="mt-0.5 block text-sm text-text-secondary">
                            {content.staff.followUps.dueLabel}: {formatDate(item.followUpDate)}
                          </span>
                          {item.reason ? (
                            <span className="mt-0.5 block truncate text-xs text-text-muted">
                              {item.reason}
                            </span>
                          ) : null}
                        </span>
                        <Badge variant="outline" className="shrink-0">
                          {item.status}
                        </Badge>
                      </Link>
                    </li>
                  );
                }

                const item = entry.item;
                const Icon = activeCategory?.icon ?? PhoneCall;
                return (
                  <li key={`${item.masterSource}:${item.recordId}`}>
                    <Link
                      href={viewAllHref}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3.5 transition-colors sm:px-5",
                        "hover:bg-surface-secondary/40",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/50 focus-visible:ring-inset",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-card",
                          activeCategory?.urgent
                            ? "bg-status-warning/15 text-status-warning"
                            : "bg-brand-gold/10 text-brand-gold",
                        )}
                      >
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-text-primary">
                          {item.displayName}
                        </span>
                        <span className="mt-0.5 block text-sm text-text-secondary">
                          {item.visitSummary}
                        </span>
                        <span className="mt-0.5 block text-xs text-text-muted">
                          {item.visitDateLabel}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            {activeTotal > listItems.length ? (
              <div className="border-t border-border px-4 py-3 sm:px-5">
                <Link
                  href={viewAllHref}
                  className="text-sm font-medium text-brand-gold hover:underline"
                >
                  {filterCopy.viewAll} ({activeTotal})
                </Link>
              </div>
            ) : null}
          </>
        )
      ) : null}

      {activeFilter === null && !countsLoading && filterOptions.length > 0 ? (
        <p className="px-4 py-6 text-sm text-text-secondary sm:px-5">
          {filterCopy.selectPrompt}
        </p>
      ) : null}
    </section>
  );
}

"use client";

import Link from "next/link";
import { useMemo } from "react";
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
import { useStaffCallFilterCounts } from "@/hooks/useStaffCalls";
import {
  STAFF_DASHBOARD_PATH,
  STORE_MANAGER_DASHBOARD_PATH,
} from "@/lib/auth/routes";
import { defaultStaffCallsParams } from "@/lib/query/initial-data";
import { cn } from "@/lib/utils";
import { buildStaffCallsSearchParams } from "@/lib/utils/staff-calls-url";
import type { GetStaffCallsParams, StaffCallFilterCounts } from "@/types";
import type { LucideIcon } from "lucide-react";

interface DashboardNotificationsProps {
  variant: "staff" | "store_manager";
  storeId?: string;
}

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  href: string;
  count: number;
  icon: LucideIcon;
  urgent?: boolean;
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

  const isLoading = followUpsLoading || filtersLoading;

  const callsBasePath =
    variant === "staff"
      ? `${STAFF_DASHBOARD_PATH}/calls`
      : `${STORE_MANAGER_DASHBOARD_PATH}/my-calls`;

  const followUpsHref =
    variant === "staff"
      ? `${STAFF_DASHBOARD_PATH}/follow-ups`
      : `${STORE_MANAGER_DASHBOARD_PATH}/calls`;

  const items = useMemo(() => {
    const notifications: NotificationItem[] = [];
    const followUps = openFollowUps ?? [];
    const overdueCount = followUps.filter((item) =>
      isOverdueFollowUp(item.followUpDate),
    ).length;
    const dueTodayCount = followUps.filter((item) =>
      isDueTodayFollowUp(item.followUpDate),
    ).length;
    const followUpCallCount = countFromFilters(filterCounts, "queues", "FOLLOW_UP");
    const notAnsweredCount = countFromFilters(
      filterCounts,
      "queues",
      "NOT_ANSWERED",
    );
    const birthdayCount = countFromFilters(
      filterCounts,
      "birthdays",
      "THIS_MONTH",
    );
    const anniversaryCount = countFromFilters(
      filterCounts,
      "anniversaries",
      "THIS_MONTH",
    );

    if (overdueCount > 0) {
      notifications.push({
        id: "overdue-follow-ups",
        title: copy.overdueFollowUps.title,
        description: (variant === "store_manager"
          ? copy.overdueFollowUps.descriptionStore
          : copy.overdueFollowUps.description
        ).replace("{count}", String(overdueCount)),
        href: followUpsHref,
        count: overdueCount,
        icon: CalendarClock,
        urgent: true,
      });
    }

    if (dueTodayCount > 0) {
      notifications.push({
        id: "due-today-follow-ups",
        title: copy.dueTodayFollowUps.title,
        description: copy.dueTodayFollowUps.description.replace(
          "{count}",
          String(dueTodayCount),
        ),
        href: followUpsHref,
        count: dueTodayCount,
        icon: CalendarClock,
      });
    }

    if (followUpCallCount > 0) {
      notifications.push({
        id: "follow-up-calls",
        title: copy.followUpCalls.title,
        description: copy.followUpCalls.description.replace(
          "{count}",
          String(followUpCallCount),
        ),
        href: callsHref(callsBasePath, { queue: "FOLLOW_UP" }),
        count: followUpCallCount,
        icon: PhoneCall,
      });
    }

    if (notAnsweredCount > 0) {
      notifications.push({
        id: "not-answered-calls",
        title: copy.notAnsweredCalls.title,
        description: copy.notAnsweredCalls.description.replace(
          "{count}",
          String(notAnsweredCount),
        ),
        href: callsHref(callsBasePath, { queue: "NOT_ANSWERED" }),
        count: notAnsweredCount,
        icon: PhoneMissed,
        urgent: true,
      });
    }

    if (birthdayCount > 0) {
      notifications.push({
        id: "birthdays",
        title: copy.birthdays.title,
        description: copy.birthdays.description.replace(
          "{count}",
          String(birthdayCount),
        ),
        href: callsHref(callsBasePath, { birthday: "THIS_MONTH" }),
        count: birthdayCount,
        icon: Cake,
      });
    }

    if (anniversaryCount > 0) {
      notifications.push({
        id: "anniversaries",
        title: copy.anniversaries.title,
        description: copy.anniversaries.description.replace(
          "{count}",
          String(anniversaryCount),
        ),
        href: callsHref(callsBasePath, { anniversary: "THIS_MONTH" }),
        count: anniversaryCount,
        icon: Heart,
      });
    }

    return notifications;
  }, [
    callsBasePath,
    copy,
    filterCounts,
    followUpsHref,
    openFollowUps,
    variant,
  ]);

  return (
    <section
      className="rounded-card border border-border bg-surface-card shadow-card"
      aria-label={copy.title}
    >
      <div className="flex items-center gap-2 border-b border-border px-4 py-3 sm:px-5">
        <Bell className="h-5 w-5 shrink-0 text-brand-gold" aria-hidden />
        <h2 className="font-display text-lg font-semibold text-text-primary">
          {copy.title}
        </h2>
        {!isLoading && items.length > 0 ? (
          <Badge variant="outline" className="ml-auto">
            {items.length}
          </Badge>
        ) : null}
      </div>

      {isLoading ? (
        <div className="space-y-3 p-4 sm:p-5">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full rounded-input" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="px-4 py-5 text-sm text-text-secondary sm:px-5">{copy.empty}</p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-start gap-3 px-4 py-3 transition-colors sm:px-5",
                    "hover:bg-surface-secondary/40",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/50 focus-visible:ring-inset",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-card",
                      item.urgent
                        ? "bg-status-warning/15 text-status-warning"
                        : "bg-brand-gold/10 text-brand-gold",
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-text-primary">
                      {item.title}
                    </span>
                    <span className="mt-0.5 block text-sm text-text-secondary">
                      {item.description}
                    </span>
                  </span>
                  <Badge
                    variant={item.urgent ? "default" : "outline"}
                    className={cn(
                      "shrink-0",
                      item.urgent && "bg-status-warning text-white hover:bg-status-warning",
                    )}
                  >
                    {item.count}
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

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
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { content } from "@/content/en";
import { useBusinessOwnerStoreNotifications } from "@/hooks/useBusinessOwnerStoreNotifications";
import { BUSINESS_OWNER_DASHBOARD_PATH } from "@/lib/auth/routes";
import { defaultStaffCallsParams } from "@/lib/query/initial-data";
import {
  storeNotificationCount,
  type StoreNotificationStaffSummary,
  type StoreNotificationSummary,
} from "@/lib/services/store-dashboard-notifications.types";
import { cn } from "@/lib/utils";
import { buildStaffCallsSearchParams } from "@/lib/utils/staff-calls-url";
import type { GetStaffCallsParams } from "@/types";
import type { LucideIcon } from "lucide-react";

type NotificationKind =
  | "overdue_follow_up"
  | "not_answered"
  | "due_today_follow_up"
  | "follow_up_calls"
  | "birthdays"
  | "anniversaries";

interface PrioritizedNotificationItem {
  id: string;
  storeId: string;
  storeName: string;
  storeCity: string;
  storeState: string;
  kind: NotificationKind;
  title: string;
  description: string;
  count: number;
  href: string;
  icon: LucideIcon;
  urgent: boolean;
  priority: number;
}

interface PrioritizedStaffItem {
  id: string;
  storeId: string;
  storeName: string;
  staffName: string;
  details: string;
  score: number;
}

const NOTIFICATION_PRIORITY: Record<NotificationKind, number> = {
  overdue_follow_up: 0,
  not_answered: 1,
  due_today_follow_up: 2,
  follow_up_calls: 3,
  birthdays: 4,
  anniversaries: 5,
};

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

function staffPriorityScore(staff: StoreNotificationStaffSummary): number {
  return (
    staff.overdueFollowUps * 4 +
    staff.notAnsweredCalls * 3 +
    staff.followUpCalls * 2 +
    staff.dueTodayFollowUps
  );
}

function formatStaffDetails(
  staff: StoreNotificationStaffSummary,
  copy: (typeof content)["dashboardNotifications"]["businessOwner"],
): string {
  const parts: string[] = [];
  const detail = copy.staffDetail;

  if (staff.overdueFollowUps > 0) {
    parts.push(
      detail.overdueFollowUps.replace("{count}", String(staff.overdueFollowUps)),
    );
  }
  if (staff.dueTodayFollowUps > 0) {
    parts.push(
      detail.dueTodayFollowUps.replace("{count}", String(staff.dueTodayFollowUps)),
    );
  }
  if (staff.followUpCalls > 0) {
    parts.push(
      detail.followUpCalls.replace("{count}", String(staff.followUpCalls)),
    );
  }
  if (staff.notAnsweredCalls > 0) {
    parts.push(
      detail.notAnsweredCalls.replace("{count}", String(staff.notAnsweredCalls)),
    );
  }

  return parts.join(", ");
}

function buildPrioritizedNotifications(
  stores: StoreNotificationSummary[],
  copy: (typeof content)["dashboardNotifications"],
): PrioritizedNotificationItem[] {
  const items: PrioritizedNotificationItem[] = [];

  for (const summary of stores) {
    const { totals, storeId } = summary;

    const push = (
      kind: NotificationKind,
      count: number,
      title: string,
      description: string,
      href: string,
      icon: LucideIcon,
      urgent: boolean,
    ) => {
      if (count <= 0) return;
      items.push({
        id: `${storeId}-${kind}`,
        storeId,
        storeName: summary.storeName,
        storeCity: summary.city,
        storeState: summary.state,
        kind,
        title,
        description,
        count,
        href,
        icon,
        urgent,
        priority: NOTIFICATION_PRIORITY[kind],
      });
    };

    push(
      "overdue_follow_up",
      totals.overdueFollowUps,
      copy.overdueFollowUps.title,
      copy.overdueFollowUps.descriptionStore.replace("{count}", String(totals.overdueFollowUps)),
      `${BUSINESS_OWNER_DASHBOARD_PATH}/visits?storeId=${storeId}&followUpOnly=true`,
      CalendarClock,
      true,
    );
    push(
      "not_answered",
      totals.notAnsweredCalls,
      copy.notAnsweredCalls.title,
      copy.notAnsweredCalls.description.replace("{count}", String(totals.notAnsweredCalls)),
      ownerCallsHref(storeId, { queue: "NOT_ANSWERED" }),
      PhoneMissed,
      true,
    );
    push(
      "due_today_follow_up",
      totals.dueTodayFollowUps,
      copy.dueTodayFollowUps.title,
      copy.dueTodayFollowUps.description.replace("{count}", String(totals.dueTodayFollowUps)),
      `${BUSINESS_OWNER_DASHBOARD_PATH}/visits?storeId=${storeId}&followUpOnly=true`,
      CalendarClock,
      false,
    );
    push(
      "follow_up_calls",
      totals.followUpCalls,
      copy.followUpCalls.title,
      copy.followUpCalls.description.replace("{count}", String(totals.followUpCalls)),
      ownerCallsHref(storeId, { queue: "FOLLOW_UP" }),
      PhoneCall,
      false,
    );
    push(
      "birthdays",
      totals.birthdays,
      copy.birthdays.title,
      copy.birthdays.description.replace("{count}", String(totals.birthdays)),
      ownerCallsHref(storeId, { birthday: "THIS_MONTH" }),
      Cake,
      false,
    );
    push(
      "anniversaries",
      totals.anniversaries,
      copy.anniversaries.title,
      copy.anniversaries.description.replace("{count}", String(totals.anniversaries)),
      ownerCallsHref(storeId, { anniversary: "THIS_MONTH" }),
      Heart,
      false,
    );
  }

  return items.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    if (b.count !== a.count) return b.count - a.count;
    return a.storeName.localeCompare(b.storeName);
  });
}

function buildPrioritizedStaff(
  stores: StoreNotificationSummary[],
  copy: (typeof content)["dashboardNotifications"]["businessOwner"],
): PrioritizedStaffItem[] {
  const items: PrioritizedStaffItem[] = [];

  for (const summary of stores) {
    for (const staff of summary.staff) {
      const details = formatStaffDetails(staff, copy);
      if (!details) continue;
      items.push({
        id: `${summary.storeId}-${staff.staffId}`,
        storeId: summary.storeId,
        storeName: summary.storeName,
        staffName: staff.staffName,
        details,
        score: staffPriorityScore(staff),
      });
    }
  }

  return items.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.storeName.localeCompare(b.storeName) || a.staffName.localeCompare(b.staffName);
  });
}

export function BusinessOwnerStoreNotifications() {
  const copy = content.dashboardNotifications;
  const ownerCopy = copy.businessOwner;
  const { data, isLoading } = useBusinessOwnerStoreNotifications();
  const stores = data?.data ?? [];

  const prioritizedItems = useMemo(
    () => buildPrioritizedNotifications(stores, copy),
    [copy, stores],
  );
  const prioritizedStaff = useMemo(
    () => buildPrioritizedStaff(stores, ownerCopy),
    [ownerCopy, stores],
  );

  const totalCount = useMemo(
    () => stores.reduce((sum, store) => sum + storeNotificationCount(store), 0),
    [stores],
  );
  const activeStoreCount = useMemo(
    () => stores.filter((store) => storeNotificationCount(store) > 0).length,
    [stores],
  );

  return (
    <section
      className="min-w-0 rounded-card border border-border bg-surface-card shadow-card"
      aria-label={ownerCopy.title}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
        <div>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 shrink-0 text-brand-gold" aria-hidden />
            <h2 className="font-display text-lg font-semibold text-text-primary sm:text-xl">
              {ownerCopy.title}
            </h2>
          </div>
          <p className="mt-1 text-sm text-text-secondary">{ownerCopy.subtitle}</p>
        </div>
        {!isLoading && totalCount > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">
              {activeStoreCount} store{activeStoreCount === 1 ? "" : "s"}
            </Badge>
            <Badge
              variant="outline"
              className="border-status-warning/40 bg-status-warning/10 text-status-warning"
            >
              {totalCount} pending
            </Badge>
          </div>
        ) : null}
      </div>

      {isLoading ? (
        <div className="space-y-3 p-4 sm:p-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full rounded-input" />
          ))}
        </div>
      ) : prioritizedItems.length === 0 ? (
        <p className="px-4 py-5 text-sm text-text-secondary sm:px-5">{ownerCopy.empty}</p>
      ) : (
        <>
          <ul className="divide-y divide-border">
            {prioritizedItems.map((item) => {
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
                        <span className="text-brand-gold">{item.storeName}</span>
                        <span className="text-text-muted"> · </span>
                        {item.title}
                      </span>
                      <span className="mt-0.5 block text-sm text-text-secondary">
                        {item.storeCity}, {item.storeState} — {item.description}
                      </span>
                    </span>
                    <Badge
                      variant={item.urgent ? "default" : "outline"}
                      className={cn(
                        "shrink-0",
                        item.urgent &&
                          "bg-status-warning text-white hover:bg-status-warning",
                      )}
                    >
                      {item.count}
                    </Badge>
                  </Link>
                </li>
              );
            })}
          </ul>

          {prioritizedStaff.length > 0 ? (
            <div className="border-t border-border bg-surface-secondary/20 px-4 py-4 sm:px-5">
              <div className="mb-3 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-text-muted">
                <Users className="h-3.5 w-3.5" aria-hidden />
                {ownerCopy.staffHeading}
              </div>
              <ul className="space-y-2 text-sm text-text-secondary">
                {prioritizedStaff.map((staff) => (
                  <li key={staff.id} className="leading-snug">
                    <span className="font-medium text-text-primary">{staff.storeName}</span>
                    <span className="text-text-muted"> · </span>
                    <span className="font-medium text-text-primary">{staff.staffName}</span>
                    <span className="text-text-muted"> — </span>
                    {staff.details}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

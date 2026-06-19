"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Bell,
  Cake,
  Heart,
  ListTodo,
  PhoneCall,
  PhoneMissed,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { content } from "@/content/en";
import { useFollowUps } from "@/hooks/useFollowUps";
import {
  useRevealStaffCallPhone,
  useStaffCallFilterCounts,
  useStaffCalls,
  useSubmitStaffCallOutcome,
} from "@/hooks/useStaffCalls";
import { toast } from "@/hooks/useToast";
import { CallFeedbackDialog } from "@/components/staff/CallFeedbackDialog";
import { FollowUpCard } from "@/components/staff/FollowUpCard";
import { StaffCallCard } from "@/components/shared/calls";
import {
  STAFF_DASHBOARD_PATH,
  STORE_MANAGER_DASHBOARD_PATH,
} from "@/lib/auth/routes";
import { defaultStaffCallsParams } from "@/lib/query/initial-data";
import { getPortalErrorMessage } from "@/lib/utils/api-error-message";
import { cn } from "@/lib/utils";
import { buildStaffCallsSearchParams } from "@/lib/utils/staff-calls-url";
import { buildFollowUpsHref } from "@/lib/utils/follow-ups-url";
import { resolveStaffCallRecordApi } from "@/lib/api/staff-calls";
import {
  isDueTodayFollowUpDate,
  isOverdueFollowUpDate,
} from "@/lib/utils/follow-up-status";
import type {
  FollowUpListItem,
  GetStaffCallsParams,
  StaffCallFilterCounts,
  StaffCallListItem,
} from "@/types";
import type { LucideIcon } from "lucide-react";

interface DashboardNotificationsProps {
  variant: "staff" | "store_manager" | "store_manager_personal";
  storeId?: string;
  /** Embedded inside StaffWorkQueue browse mode — no standalone header/footer chrome. */
  presentation?: "standalone" | "embedded";
}

type NotificationFilter =
  | "overdue_follow_ups"
  | "due_today_follow_ups"
  | "follow_up_calls"
  | "not_answered_calls"
  | "birthdays"
  | "anniversaries";

type CategoryPriority = "critical" | "high" | "medium" | "low";

const CATEGORY_PRIORITY: Record<NotificationFilter, CategoryPriority> = {
  overdue_follow_ups: "critical",
  due_today_follow_ups: "high",
  follow_up_calls: "medium",
  not_answered_calls: "high",
  birthdays: "low",
  anniversaries: "low",
};

const CATEGORY_CARD_STYLES: Record<
  CategoryPriority,
  { iconWrap: string; icon: string; count: string; countActive: string }
> = {
  critical: {
    iconWrap: "bg-status-error/12 ring-1 ring-status-error/20",
    icon: "text-status-error",
    count: "bg-status-error/12 text-status-error ring-1 ring-status-error/20",
    countActive: "bg-status-error/15 text-status-error",
  },
  high: {
    iconWrap: "bg-status-warning/12 ring-1 ring-status-warning/20",
    icon: "text-status-warning",
    count: "bg-status-warning/12 text-status-warning ring-1 ring-status-warning/20",
    countActive: "bg-status-warning/15 text-status-warning",
  },
  medium: {
    iconWrap: "bg-brand-gold/12 ring-1 ring-brand-gold/20",
    icon: "text-brand-gold",
    count: "bg-brand-gold/12 text-brand-gold ring-1 ring-brand-gold/20",
    countActive: "bg-brand-gold/15 text-brand-gold",
  },
  low: {
    iconWrap: "bg-surface-secondary ring-1 ring-border",
    icon: "text-brand-gold/80",
    count: "bg-surface-secondary text-text-secondary ring-1 ring-border",
    countActive: "bg-brand-gold/10 text-brand-gold",
  },
};

function categoryDescription(
  key: NotificationFilter,
  count: number,
  copy: (typeof content)["dashboardNotifications"],
): string {
  const countLabel = String(count);
  switch (key) {
    case "overdue_follow_ups":
      return copy.overdueFollowUps.description.replace("{count}", countLabel);
    case "due_today_follow_ups":
      return copy.dueTodayFollowUps.description.replace("{count}", countLabel);
    case "follow_up_calls":
      return copy.followUpCalls.description.replace("{count}", countLabel);
    case "not_answered_calls":
      return copy.notAnsweredCalls.description.replace("{count}", countLabel);
    case "birthdays":
      return copy.birthdays.description.replace("{count}", countLabel);
    case "anniversaries":
      return copy.anniversaries.description.replace("{count}", countLabel);
  }
}

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

function isOverdueFollowUp(followUpDate: string): boolean {
  return isOverdueFollowUpDate(followUpDate);
}

function isDueTodayFollowUp(followUpDate: string): boolean {
  return isDueTodayFollowUpDate(followUpDate);
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
  presentation = "standalone",
}: DashboardNotificationsProps) {
  const embedded = presentation === "embedded";
  const copy = content.dashboardNotifications;
  const filterCopy = copy.filters;
  const callParams = useMemo(
    () => ({
      ...defaultStaffCallsParams(),
      ...(storeId ? { storeId } : {}),
      ...(variant === "store_manager_personal" ? { personalScope: true } : {}),
    }),
    [storeId, variant],
  );

  const {
    data: openFollowUps,
    isLoading: followUpsLoading,
    isError: followUpsError,
    error: followUpsQueryError,
    refetch: refetchFollowUps,
  } = useFollowUps({
    ...(variant === "store_manager" && storeId ? { storeId } : {}),
    ...(variant === "store_manager_personal" ? { personalScope: true } : {}),
    status: "OPEN",
  });
  const {
    data: filterCounts,
    isLoading: filtersLoading,
    isError: filtersError,
    error: filtersQueryError,
  } = useStaffCallFilterCounts(callParams);

  const [activeFilter, setActiveFilter] = useState<NotificationFilter | null>(null);
  const [activeCallItem, setActiveCallItem] = useState<StaffCallListItem | null>(null);
  const [callDialogOpen, setCallDialogOpen] = useState(false);
  const [callingFollowUpId, setCallingFollowUpId] = useState<string | null>(null);

  const revealPhone = useRevealStaffCallPhone();
  const submitOutcome = useSubmitStaffCallOutcome();

  const canAssign = variant === "store_manager" && Boolean(storeId);
  const callsCopy = content.staff.calls;

  const cardLabels = useMemo(
    () => ({
      valueTierLabels: callsCopy.valueTierLabels,
      queueStatusLabels: callsCopy.queueStatusLabels,
      masterSourceLabels: callsCopy.masterSourceLabels,
      callOutcomeLabels: callsCopy.callOutcomeLabels,
      purchaseStatusLabels: callsCopy.purchaseStatusLabels,
      customerTypeLabels: callsCopy.customerTypeLabels,
      notesLabel: callsCopy.notesLabel,
      due: callsCopy.due,
      call: callsCopy.call,
      noPhone: callsCopy.noPhone,
    }),
    [callsCopy],
  );

  const callsBasePath =
    variant === "staff" || variant === "store_manager_personal"
      ? variant === "store_manager_personal"
        ? `${STORE_MANAGER_DASHBOARD_PATH}/my-calls`
        : `${STAFF_DASHBOARD_PATH}/calls`
      : `${STORE_MANAGER_DASHBOARD_PATH}/calls`;

  const followUpsHref =
    variant === "staff"
      ? `${STAFF_DASHBOARD_PATH}/follow-ups`
      : variant === "store_manager_personal"
        ? `${STORE_MANAGER_DASHBOARD_PATH}/my-follow-ups`
        : `${STORE_MANAGER_DASHBOARD_PATH}/follow-ups`;

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
        icon: ListTodo,
        urgent: true,
        kind: "follow_ups",
        href: () => buildFollowUpsHref(followUpsHref, "overdue"),
      },
      due_today_follow_ups: {
        key: "due_today_follow_ups",
        title: copy.dueTodayFollowUps.title,
        icon: ListTodo,
        kind: "follow_ups",
        href: () => buildFollowUpsHref(followUpsHref, "due_today"),
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

  const { data: callsData, isLoading: callsListLoading, refetch: refetchCalls } = useStaffCalls(
    activeCallParams ?? callParams,
    { enabled: activeCallParams !== null },
  );

  async function handleOpenCall(item: StaffCallListItem) {
    setActiveCallItem(item);
    setCallDialogOpen(true);
    revealPhone.reset();
    try {
      await revealPhone.mutateAsync({
        recordId: item.recordId,
        masterSource: item.masterSource,
        storeId,
      });
    } catch (error) {
      handleCloseCallDialog(false);
      toast({
        title: getPortalErrorMessage(error, content.errors),
      });
    }
  }

  async function handleCallFromFollowUp(item: FollowUpListItem) {
    setCallingFollowUpId(item.id);
    try {
      const callItem = await resolveStaffCallRecordApi({
        visitId: item.visitId ?? undefined,
        fieldSaleId: item.fieldSaleId ?? undefined,
        storeId,
      });
      await handleOpenCall(callItem);
    } catch (error) {
      toast({
        title: getPortalErrorMessage(error, content.errors),
      });
    } finally {
      setCallingFollowUpId(null);
    }
  }

  function handleCloseCallDialog(open: boolean) {
    setCallDialogOpen(open);
    if (!open) {
      setActiveCallItem(null);
      revealPhone.reset();
    }
  }

  function handleSubmitCallOutcome(
    payload: Parameters<typeof submitOutcome.mutate>[0]["payload"],
  ) {
    if (!activeCallItem) return;

    submitOutcome.mutate(
      {
        ref: {
          recordId: activeCallItem.recordId,
          masterSource: activeCallItem.masterSource,
          storeId,
        },
        payload,
      },
      {
        onSuccess: () => {
          toast({ title: callsCopy.dialog.feedbackSaved });
          handleCloseCallDialog(false);
          void refetchCalls();
          void refetchFollowUps();
        },
        onError: (error) => {
          toast({
            title: getPortalErrorMessage(error, content.errors),
          });
        },
      },
    );
  }

  const countsLoading = followUpsLoading || filtersLoading;

  const filterOptions = useMemo(() => {
    const followUpCallCount = countFromFilters(filterCounts, "queues", "FOLLOW_UP");
    const notAnsweredCount = countFromFilters(filterCounts, "queues", "NOT_ANSWERED");
    const birthdayCount = countFromFilters(filterCounts, "birthdays", "THIS_MONTH");
    const anniversaryCount = countFromFilters(filterCounts, "anniversaries", "THIS_MONTH");

    return [
      {
        key: "overdue_follow_ups" as const,
        label: copy.overdueFollowUps.title,
        description: categoryDescription("overdue_follow_ups", overdueFollowUps.length, copy),
        icon: ListTodo,
        count: overdueFollowUps.length,
        urgent: true,
        priority: CATEGORY_PRIORITY.overdue_follow_ups,
      },
      {
        key: "due_today_follow_ups" as const,
        label: copy.dueTodayFollowUps.title,
        description: categoryDescription("due_today_follow_ups", dueTodayFollowUps.length, copy),
        icon: ListTodo,
        count: dueTodayFollowUps.length,
        priority: CATEGORY_PRIORITY.due_today_follow_ups,
      },
      {
        key: "follow_up_calls" as const,
        label: copy.followUpCalls.title,
        description: categoryDescription("follow_up_calls", followUpCallCount, copy),
        icon: PhoneCall,
        count: followUpCallCount,
        priority: CATEGORY_PRIORITY.follow_up_calls,
      },
      {
        key: "not_answered_calls" as const,
        label: copy.notAnsweredCalls.title,
        description: categoryDescription("not_answered_calls", notAnsweredCount, copy),
        icon: PhoneMissed,
        count: notAnsweredCount,
        urgent: true,
        priority: CATEGORY_PRIORITY.not_answered_calls,
      },
      {
        key: "birthdays" as const,
        label: copy.birthdays.title,
        description: categoryDescription("birthdays", birthdayCount, copy),
        icon: Cake,
        count: birthdayCount,
        priority: CATEGORY_PRIORITY.birthdays,
      },
      {
        key: "anniversaries" as const,
        label: copy.anniversaries.title,
        description: categoryDescription("anniversaries", anniversaryCount, copy),
        icon: Heart,
        count: anniversaryCount,
        priority: CATEGORY_PRIORITY.anniversaries,
      },
    ];
  }, [copy, dueTodayFollowUps.length, filterCounts, overdueFollowUps.length]);

  const totalPendingCount = useMemo(
    () => filterOptions.reduce((sum, option) => sum + option.count, 0),
    [filterOptions],
  );

  const activeCategoryHint =
    activeFilter && copy.categoryHints[activeFilter]
      ? copy.categoryHints[activeFilter]
      : null;

  const followUpListParams = useMemo(() => {
    if (activeFilter === "due_today_follow_ups") {
      return { filter: "due_today" as const, ...(storeId ? { storeId } : {}) };
    }
    if (activeFilter === "overdue_follow_ups") {
      return { overdue: true as const, ...(storeId ? { storeId } : {}) };
    }
    return { status: "OPEN" as const, ...(storeId ? { storeId } : {}) };
  }, [activeFilter, storeId]);

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

  const loadErrorMessage = useMemo(() => {
    if (followUpsError) {
      return getPortalErrorMessage(followUpsQueryError, content.errors);
    }
    if (filtersError) {
      return getPortalErrorMessage(filtersQueryError, content.errors);
    }
    return null;
  }, [followUpsError, followUpsQueryError, filtersError, filtersQueryError]);

  function renderCategoryGrid(className: string) {
    if (countsLoading) {
      return (
        <div className={className}>
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-[5.5rem] rounded-card" />
          ))}
        </div>
      );
    }

    return (
      <div className={className} role="tablist" aria-label={copy.title}>
        {filterOptions.map((option) => {
          const isActive = activeFilter === option.key;
          const Icon = option.icon;
          const styles = CATEGORY_CARD_STYLES[option.priority];
          const isEmpty = option.count === 0;

          return (
            <button
              key={option.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveFilter(isActive ? null : option.key)}
              className={cn(
                "flex w-full items-start gap-3 rounded-card border p-3.5 text-left transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/50",
                isActive
                  ? "border-brand-gold bg-brand-gold/[0.06] shadow-sm ring-1 ring-brand-gold/25"
                  : isEmpty
                    ? "border-border bg-surface-secondary/40 hover:bg-surface-secondary/70"
                    : "border-border bg-surface-card hover:border-brand-gold/30 hover:bg-brand-gold/[0.03]",
              )}
            >
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                  isActive ? "bg-brand-gold/15 ring-1 ring-brand-gold/25" : styles.iconWrap,
                  isEmpty && !isActive && "opacity-60",
                )}
              >
                <Icon
                  className={cn(
                    "h-[1.125rem] w-[1.125rem]",
                    isActive ? "text-brand-gold" : styles.icon,
                  )}
                  aria-hidden
                />
              </span>

              <span className="min-w-0 flex-1 pt-0.5">
                <span
                  className={cn(
                    "block text-sm font-semibold leading-snug",
                    isActive ? "text-text-primary" : isEmpty ? "text-text-muted" : "text-text-primary",
                  )}
                >
                  {option.label}
                </span>
                <span
                  className={cn(
                    "mt-1 block text-xs leading-relaxed",
                    isActive ? "text-text-secondary" : isEmpty ? "text-text-muted" : "text-text-muted",
                  )}
                >
                  {option.description}
                </span>
              </span>

              <span
                className={cn(
                  "flex h-10 min-w-[2.5rem] shrink-0 items-center justify-center rounded-full px-2.5 font-numeric text-xl font-bold tabular-nums leading-none",
                  isActive
                    ? styles.countActive
                    : isEmpty
                      ? "bg-surface-secondary text-text-muted ring-1 ring-border"
                      : styles.count,
                )}
              >
                {option.count}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  const Wrapper = embedded ? "div" : "section";

  return (
    <Wrapper
      className={
        embedded
          ? "min-w-0"
          : "min-w-0 overflow-hidden rounded-card border border-border bg-surface-card shadow-card"
      }
      aria-label={embedded ? undefined : copy.title}
    >
      {!embedded ? (
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
            {!countsLoading && totalPendingCount === 0 ? (
              <p className="mt-1 text-sm text-status-success">{copy.empty}</p>
            ) : (
              <p className="mt-1 text-sm text-text-muted">{copy.filters.guide}</p>
            )}
            {loadErrorMessage ? (
              <p className="mt-2 text-sm text-status-error" role="alert">
                {loadErrorMessage}
              </p>
            ) : null}
          </div>
        </div>

        {renderCategoryGrid("mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3")}
      </div>
      ) : (
        <>
          {loadErrorMessage ? (
            <p className="px-4 py-3 text-sm text-status-error sm:px-5" role="alert">
              {loadErrorMessage}
            </p>
          ) : null}
          {renderCategoryGrid("grid gap-3 px-4 py-4 sm:grid-cols-2 sm:px-5 lg:grid-cols-3")}
        </>
      )}

      {activeFilter !== null ? (
        listLoading ? (
          <div className="space-y-3 p-4 sm:p-5">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-32 w-full rounded-card" />
            ))}
          </div>
        ) : listItems.length === 0 ? (
          <p className="px-4 py-6 text-sm text-text-secondary sm:px-5">{filterCopy.empty}</p>
        ) : (
          <>
            {activeCategoryHint ? (
              <p className="border-b border-border px-4 py-3 text-sm text-text-muted sm:px-5">
                {activeCategoryHint}
              </p>
            ) : null}
            {activeTotal > listItems.length ? (
              <p className="border-b border-border px-4 py-2 text-xs text-text-muted sm:px-5">
                {filterCopy.previewHint.replace("{shown}", String(listItems.length)).replace(
                  "{total}",
                  String(activeTotal),
                )}
              </p>
            ) : null}
            <div className="space-y-3 p-4 sm:p-5">
              {listItems.map((entry) => {
                if (entry.type === "follow_up") {
                  return (
                    <FollowUpCard
                      key={entry.item.id}
                      item={entry.item}
                      storeId={storeId}
                      canAssign={canAssign}
                      listParams={followUpListParams}
                      onUpdated={() => void refetchFollowUps()}
                      onCall={(followUp) => void handleCallFromFollowUp(followUp)}
                      isCalling={callingFollowUpId === entry.item.id}
                    />
                  );
                }

                const item = entry.item;
                return (
                  <StaffCallCard
                    key={`${item.masterSource}:${item.recordId}`}
                    item={item}
                    labels={cardLabels}
                    onCall={(callItem) => void handleOpenCall(callItem)}
                    canAssign={canAssign}
                    storeId={storeId}
                    onAssigned={() => void refetchCalls()}
                  />
                );
              })}
            </div>
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

      <CallFeedbackDialog
        copy={callsCopy}
        item={activeCallItem}
        open={callDialogOpen}
        onOpenChange={handleCloseCallDialog}
        dialInfo={revealPhone.data ?? null}
        isDialLoading={revealPhone.isPending}
        isSubmitting={submitOutcome.isPending}
        onSubmit={handleSubmitCallOutcome}
      />

      {activeFilter === null && !countsLoading && !embedded ? (
        <p className="px-4 py-6 text-sm text-text-secondary sm:px-5">
          {filterCopy.selectPrompt}
        </p>
      ) : null}
    </Wrapper>
  );
}


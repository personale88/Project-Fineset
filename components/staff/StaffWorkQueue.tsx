"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import {
  Cake,
  ChevronDown,
  Heart,
  ListTodo,
  Phone,
  PhoneCall,
  PhoneMissed,
} from "lucide-react";
import { content } from "@/content/en";
import { useStaffWorkQueue } from "@/hooks/useStaffWorkQueue";
import { useStaffCallFlow } from "@/hooks/useStaffCallFlow";
import { STAFF_DASHBOARD_PATH } from "@/lib/auth/routes";
import { getPortalErrorMessage } from "@/lib/utils/api-error-message";
import { buildFollowUpsHref } from "@/lib/utils/follow-ups-url";
import { buildStaffCallsSearchParams } from "@/lib/utils/staff-calls-url";
import { defaultStaffCallsParams } from "@/lib/query/initial-data";
import { QueryLoadState } from "@/components/shared/QueryLoadState";
import { DashboardNotifications } from "@/components/dashboard/DashboardNotifications";
import { FollowUpCard } from "@/components/staff/FollowUpCard";
import { StaffCallCard } from "@/components/shared/calls";
import { CallFeedbackDialog } from "@/components/staff/CallFeedbackDialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { StaffWorkQueueItem, StaffWorkQueueReason } from "@/types/staff-work-queue";
import type { LucideIcon } from "lucide-react";

type WorkQueueMode = "compact" | "browse";

const REASON_ORDER: StaffWorkQueueReason[] = [
  "overdue_task",
  "due_today_task",
  "not_answered",
  "follow_up_call",
  "birthday",
  "anniversary",
];

type PriorityTier = "critical" | "high" | "medium" | "low";

interface ReasonPriorityStyle {
  tier: PriorityTier;
  iconWrap: string;
  icon: string;
  count: string;
  label: string;
}

const REASON_PRIORITY_STYLES: Record<StaffWorkQueueReason, ReasonPriorityStyle> = {
  overdue_task: {
    tier: "critical",
    iconWrap: "bg-status-error/15 ring-1 ring-status-error/20",
    icon: "text-status-error",
    count: "bg-status-error/15 text-status-error ring-1 ring-status-error/25",
    label: "text-status-error",
  },
  due_today_task: {
    tier: "high",
    iconWrap: "bg-status-warning/15 ring-1 ring-status-warning/20",
    icon: "text-status-warning",
    count: "bg-status-warning/15 text-status-warning ring-1 ring-status-warning/25",
    label: "text-text-primary",
  },
  not_answered: {
    tier: "high",
    iconWrap: "bg-status-warning/15 ring-1 ring-status-warning/20",
    icon: "text-status-warning",
    count: "bg-status-warning/15 text-status-warning ring-1 ring-status-warning/25",
    label: "text-text-primary",
  },
  follow_up_call: {
    tier: "medium",
    iconWrap: "bg-brand-gold/15 ring-1 ring-brand-gold/20",
    icon: "text-brand-gold",
    count: "bg-brand-gold/15 text-brand-gold ring-1 ring-brand-gold/25",
    label: "text-text-primary",
  },
  birthday: {
    tier: "low",
    iconWrap: "bg-brand-gold/10",
    icon: "text-brand-gold/80",
    count: "bg-brand-gold/10 text-brand-gold",
    label: "text-text-secondary",
  },
  anniversary: {
    tier: "low",
    iconWrap: "bg-brand-gold/10",
    icon: "text-brand-gold/80",
    count: "bg-brand-gold/10 text-brand-gold",
    label: "text-text-secondary",
  },
};

const COUNT_SIZE_BY_TIER: Record<PriorityTier, string> = {
  critical: "min-w-[2.25rem] px-2.5 text-lg",
  high: "min-w-[2rem] px-2 text-base",
  medium: "min-w-[2rem] px-2 text-base",
  low: "min-w-[1.75rem] px-2 text-sm",
};

const REASON_ICONS: Record<StaffWorkQueueReason, LucideIcon> = {
  overdue_task: ListTodo,
  due_today_task: ListTodo,
  not_answered: PhoneMissed,
  follow_up_call: PhoneCall,
  birthday: Cake,
  anniversary: Heart,
};

interface WorkQueueAccordionSectionProps {
  reason: StaffWorkQueueReason;
  label: string;
  items: StaffWorkQueueItem[];
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function WorkQueueAccordionSection({
  reason,
  label,
  items,
  isOpen,
  onToggle,
  children,
}: WorkQueueAccordionSectionProps) {
  const sectionId = useId();
  const triggerId = `${sectionId}-${reason}-trigger`;
  const panelId = `${sectionId}-${reason}-panel`;
  const Icon = REASON_ICONS[reason];
  const priority = REASON_PRIORITY_STYLES[reason];

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        id={triggerId}
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={onToggle}
        className={cn(
          "flex w-full items-center justify-between gap-3 px-4 py-3 text-left sm:px-5",
          "transition-colors hover:bg-surface-secondary/40",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-card",
        )}
      >
        <span className="flex min-w-0 flex-1 items-center gap-3">
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
              priority.iconWrap,
            )}
          >
            <Icon className={cn("h-4 w-4", priority.icon)} aria-hidden />
          </span>
          <span className="min-w-0">
            <span className={cn("block text-sm font-semibold sm:text-base", priority.label)}>
              {label}
            </span>
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2.5">
          <span
            className={cn(
              "inline-flex h-8 items-center justify-center rounded-full font-numeric font-bold tabular-nums leading-none",
              COUNT_SIZE_BY_TIER[priority.tier],
              priority.count,
            )}
          >
            {items.length}
          </span>
          <ChevronDown
            className={cn(
              "h-5 w-5 text-text-muted transition-transform duration-200",
              isOpen && "rotate-180",
            )}
            aria-hidden
          />
        </span>
      </button>
      {isOpen ? (
        <div
          id={panelId}
          role="region"
          aria-labelledby={triggerId}
          className="space-y-3 border-t border-border bg-surface-secondary/20 px-4 py-3 sm:px-5"
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function StaffWorkQueue({
  portalBasePath = STAFF_DASHBOARD_PATH,
  title,
  subtitle,
  callsPath,
  browseVariant = "staff",
  browseStoreId,
  callFlowStoreId,
}: {
  portalBasePath?: string;
  title?: string;
  subtitle?: string;
  callsPath?: string;
  browseVariant?: "staff" | "store_manager_personal";
  browseStoreId?: string;
  callFlowStoreId?: string;
} = {}) {
  const copy = content.staff.workQueue;
  const callsCopy = content.staff.calls;
  const { data, isLoading, isError, error, refetch } = useStaffWorkQueue(12);
  const callFlow = useStaffCallFlow(callFlowStoreId ?? browseStoreId);
  const [mode, setMode] = useState<WorkQueueMode>("compact");
  const [openSections, setOpenSections] = useState<Set<StaffWorkQueueReason>>(new Set());

  const modeSubtitle =
    subtitle ?? (mode === "compact" ? copy.compactSubtitle : copy.browseSubtitle);

  const cardLabels = {
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
  };

  const groupedSections = useMemo(() => {
    const groups = new Map<StaffWorkQueueReason, StaffWorkQueueItem[]>();

    for (const reason of REASON_ORDER) {
      groups.set(reason, []);
    }

    for (const item of data?.items ?? []) {
      const bucket = groups.get(item.reason);
      if (bucket) bucket.push(item);
    }

    return REASON_ORDER.map((reason) => ({
      reason,
      label: copy.sections[reason],
      items: groups.get(reason) ?? [],
    })).filter((section) => section.items.length > 0);
  }, [copy.sections, data?.items]);

  function toggleSection(reason: StaffWorkQueueReason) {
    setOpenSections((current) => {
      const next = new Set(current);
      if (next.has(reason)) {
        next.delete(reason);
      } else {
        next.add(reason);
      }
      return next;
    });
  }

  async function handleCallFromTask(
    followUpId: string,
    visitId?: string | null,
    fieldSaleId?: string | null,
  ) {
    await callFlow.openCallForRecord({
      visitId: visitId ?? undefined,
      fieldSaleId: fieldSaleId ?? undefined,
      callingKey: followUpId,
    });
  }

  function renderQueueItem(item: StaffWorkQueueItem) {
    return (
      <div key={item.id}>
        {item.followUp ? (
          <FollowUpCard
            item={item.followUp}
            onCall={(followUp) =>
              void handleCallFromTask(
                followUp.id,
                followUp.visitId,
                followUp.fieldSaleId,
              )
            }
            isCalling={callFlow.isCalling(item.followUp.id)}
            onUpdated={() => void refetch()}
          />
        ) : null}
        {item.call ? (
          <StaffCallCard
            item={item.call}
            labels={cardLabels}
            onCall={(callItem) =>
              void callFlow.openCallForRecord({
                visitId: callItem.visitId ?? undefined,
                fieldSaleId: callItem.fieldSaleId ?? undefined,
                callingKey: item.id,
              })
            }
            canAssign={false}
          />
        ) : null}
      </div>
    );
  }

  return (
    <section className="rounded-card border border-border bg-surface-card shadow-card">
      <div className="border-b border-border px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg font-semibold text-text-primary">
              {title ?? copy.title}
            </h2>
            <p className="mt-1 text-sm text-text-muted">{modeSubtitle}</p>
          </div>
          <div
            className="inline-flex rounded-input border border-border bg-surface-secondary/60 p-0.5"
            role="group"
            aria-label={copy.modes.label}
          >
            {(["compact", "browse"] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={mode === option}
                onClick={() => setMode(option)}
                className={cn(
                  "rounded-input px-3 py-1.5 text-xs font-semibold transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/50",
                  mode === option
                    ? "bg-surface-card text-text-primary shadow-sm"
                    : "text-text-muted hover:text-text-secondary",
                )}
              >
                {copy.modes[option]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {mode === "compact" ? (
      <QueryLoadState
        isLoading={isLoading}
        isError={isError}
        errorLabel={getPortalErrorMessage(error, content.errors)}
        retryLabel={content.errors.tryAgain}
        onRetry={() => void refetch()}
      >
        {!data?.items.length ? (
          <p className="px-4 py-6 text-sm text-status-success sm:px-5">{copy.empty}</p>
        ) : (
          <>
            <div className="overflow-hidden">
              {groupedSections.map((section) => (
                <WorkQueueAccordionSection
                  key={section.reason}
                  reason={section.reason}
                  label={section.label}
                  items={section.items}
                  isOpen={openSections.has(section.reason)}
                  onToggle={() => toggleSection(section.reason)}
                >
                  {section.items.map((item) => renderQueueItem(item))}
                </WorkQueueAccordionSection>
              ))}
            </div>
          </>
        )}
      </QueryLoadState>
      ) : (
        <DashboardNotifications
          variant={browseVariant}
          storeId={browseStoreId}
          presentation="embedded"
        />
      )}

      {mode === "compact" ? (
      <div className="flex flex-wrap gap-2 border-t border-border px-4 py-3 sm:px-5">
        <Button asChild variant="outline" size="sm">
          <Link href={buildFollowUpsHref(`${portalBasePath}/follow-ups`, "due_today")}>
            {copy.viewTasks}
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link
            href={`${callsPath ?? `${portalBasePath}/calls`}?${buildStaffCallsSearchParams({
              ...defaultStaffCallsParams(),
              queue: "NOT_ANSWERED",
            })}`}
          >
            <Phone className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            {copy.viewCalls}
          </Link>
        </Button>
      </div>
      ) : null}

      {mode === "compact" ? (
      <CallFeedbackDialog
        copy={callsCopy}
        item={callFlow.activeItem}
        open={callFlow.dialogOpen}
        onOpenChange={callFlow.closeDialog}
        dialInfo={callFlow.revealPhone.data ?? null}
        isDialLoading={callFlow.revealPhone.isPending}
        isSubmitting={callFlow.submitOutcome.isPending}
        onSubmit={(payload) => callFlow.submitCallOutcome(payload, () => void refetch())}
      />
      ) : null}
    </section>
  );
}

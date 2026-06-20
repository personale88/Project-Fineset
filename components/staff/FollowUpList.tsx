"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useMemo, useState } from "react";
import { content } from "@/content/en";
import { useFollowUps, type FollowUpFilter } from "@/hooks/useFollowUps";
import { getPortalErrorMessage } from "@/lib/utils/api-error-message";
import { STAFF_DASHBOARD_PATH } from "@/lib/auth/routes";
import { buildFollowUpsHref, buildTeamFollowUpsHref } from "@/lib/utils/follow-ups-url";
import { cn } from "@/lib/utils";
import { QueryLoadState } from "@/components/shared/QueryLoadState";
import { FollowUpCard } from "@/components/staff/FollowUpCard";
import { FollowUpBulkReassignBar } from "@/components/staff/FollowUpBulkReassignBar";
import { CallFeedbackDialog } from "@/components/staff/CallFeedbackDialog";
import { useStaffCallFlow } from "@/hooks/useStaffCallFlow";

interface FollowUpCopy {
  title: string;
  subtitle: string;
  guide: string;
  filters: Partial<Record<FollowUpFilter, string>> & {
    overdue: string;
    due_today: string;
    open: string;
  };
  empty: string;
  emptyDueToday: string;
  emptyOpen: string;
  emptyMismatched?: string;
}

interface FollowUpListProps {
  storeId?: string;
  viewStaffId?: string;
  canAssign?: boolean;
  backHref?: string;
  /** Route used for filter tab links (separate from back navigation). */
  followUpsBasePath?: string;
  filter?: FollowUpFilter;
  personalScope?: boolean;
  copy?: FollowUpCopy;
}

export function FollowUpList({
  storeId,
  viewStaffId,
  canAssign: canAssignProp,
  backHref = STAFF_DASHBOARD_PATH,
  followUpsBasePath: followUpsBasePathProp,
  filter = "overdue",
  personalScope = false,
  copy: copyOverride,
}: FollowUpListProps) {
  const canAssign = canAssignProp ?? Boolean(storeId && !personalScope);
  const copy = copyOverride ?? content.staff.followUps;
  const followUpsBasePath =
    followUpsBasePathProp ??
    (personalScope
      ? `${STAFF_DASHBOARD_PATH}/my-follow-ups`
      : `${STAFF_DASHBOARD_PATH}/follow-ups`);

  const filters = useMemo((): FollowUpFilter[] => {
    const base: FollowUpFilter[] = ["overdue", "due_today", "open"];
    return personalScope ? base : [...base, "mismatched"];
  }, [personalScope]);

  const queryParams = useMemo(() => {
    const staffFilter = viewStaffId ? { viewStaffId } : {};
    if (filter === "mismatched") {
      return { mismatched: true as const, storeId, ...staffFilter };
    }
    if (filter === "overdue") {
      return {
        overdue: true as const,
        ...(personalScope ? { personalScope: true as const } : { storeId, ...staffFilter }),
      };
    }
    if (filter === "due_today") {
      return {
        filter: "due_today" as const,
        ...(personalScope ? { personalScope: true as const } : { storeId, ...staffFilter }),
      };
    }
    return {
      filter: "open" as const,
      ...(personalScope ? { personalScope: true as const } : { storeId, ...staffFilter }),
    };
  }, [filter, personalScope, storeId, viewStaffId]);

  const { data, isLoading, isError, error, refetch } = useFollowUps(queryParams);
  const callFlow = useStaffCallFlow(storeId);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const showBulkReassign = canAssign && filter === "mismatched" && Boolean(storeId);
  const bulkCopy = content.store.managerDashboard.followUps.store.bulkReassign;

  const followUpIds = useMemo(() => (data ?? []).map((item) => item.id), [data]);

  function toggleSelected(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (!data?.length) return;
    if (selectedIds.size === data.length) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(data.map((item) => item.id)));
  }

  const emptyMessage =
    filter === "due_today"
      ? copy.emptyDueToday
      : filter === "open"
        ? copy.emptyOpen
        : filter === "mismatched"
          ? copy.emptyMismatched
          : copy.empty;

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary transition-colors hover:text-brand-gold"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {content.common.back}
        </Link>
        <div>
          <h1 className="font-display text-2xl font-bold text-text-primary">{copy.title}</h1>
          <p className="text-text-secondary">{copy.subtitle}</p>
          <p className="mt-2 text-sm text-text-muted">{copy.guide}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2" aria-label={copy.title}>
        {filters.map((item) => {
          const isActive = filter === item;
          const href =
            viewStaffId && item !== "mismatched"
              ? buildTeamFollowUpsHref(followUpsBasePath, viewStaffId, item)
              : buildFollowUpsHref(followUpsBasePath, item);
          return (
            <Link
              key={item}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "rounded-chip px-3 py-1.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-brand-gold text-white"
                  : "bg-surface-secondary text-text-secondary hover:text-brand-gold",
              )}
            >
              {copy.filters[item] ?? item}
            </Link>
          );
        })}
      </div>

      {showBulkReassign && storeId ? (
        <FollowUpBulkReassignBar
          storeId={storeId}
          followUpIds={followUpIds}
          selectedIds={selectedIds}
          onToggle={toggleSelected}
          onToggleAll={toggleAll}
          onComplete={() => {
            setSelectedIds(new Set());
            void refetch();
          }}
        />
      ) : null}

      <QueryLoadState
        isLoading={isLoading}
        isError={isError}
        errorLabel={getPortalErrorMessage(error, content.errors)}
        retryLabel={content.errors.tryAgain}
        onRetry={() => void refetch()}
      >
        {!data?.length ? (
          <p className="text-sm text-text-secondary">{emptyMessage}</p>
        ) : (
          <ul className="space-y-3">
            {data.map((item) => (
              <li key={item.id} className="flex gap-3">
                {showBulkReassign ? (
                  <div className="pt-4">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-border accent-brand-gold"
                      checked={selectedIds.has(item.id)}
                      onChange={() => toggleSelected(item.id)}
                      aria-label={bulkCopy.selected.replace("{count}", "1")}
                    />
                  </div>
                ) : null}
                <div className="min-w-0 flex-1">
                  <FollowUpCard
                  item={item}
                  storeId={storeId}
                  canAssign={canAssign}
                  listParams={queryParams}
                  onUpdated={() => void refetch()}
                  onCall={(followUp) =>
                    void callFlow.openCallForRecord({
                      visitId: followUp.visitId ?? undefined,
                      fieldSaleId: followUp.fieldSaleId ?? undefined,
                      storeId,
                      callingKey: followUp.id,
                    })
                  }
                  isCalling={callFlow.isCalling(item.id)}
                />
                </div>
              </li>
            ))}
          </ul>
        )}
      </QueryLoadState>

      <CallFeedbackDialog
        copy={content.staff.calls}
        item={callFlow.activeItem}
        open={callFlow.dialogOpen}
        onOpenChange={callFlow.closeDialog}
        dialInfo={callFlow.revealPhone.data ?? null}
        isDialLoading={callFlow.revealPhone.isPending}
        isSubmitting={callFlow.submitOutcome.isPending}
        onSubmit={(payload) => callFlow.submitCallOutcome(payload, () => void refetch())}
      />
    </div>
  );
}

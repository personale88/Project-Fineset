"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useMemo } from "react";
import { content } from "@/content/en";
import { useFollowUps, type FollowUpFilter } from "@/hooks/useFollowUps";
import { getPortalErrorMessage } from "@/lib/utils/api-error-message";
import { STAFF_DASHBOARD_PATH } from "@/lib/auth/routes";
import { buildFollowUpsHref } from "@/lib/utils/follow-ups-url";
import { cn } from "@/lib/utils";
import { QueryLoadState } from "@/components/shared/QueryLoadState";
import { FollowUpCard } from "@/components/staff/FollowUpCard";
import { CallFeedbackDialog } from "@/components/staff/CallFeedbackDialog";
import { useStaffCallFlow } from "@/hooks/useStaffCallFlow";

interface FollowUpListProps {
  storeId?: string;
  canAssign?: boolean;
  backHref?: string;
  filter?: FollowUpFilter;
}

const filters: FollowUpFilter[] = ["overdue", "due_today", "open"];

export function FollowUpList({
  storeId,
  canAssign: canAssignProp,
  backHref = STAFF_DASHBOARD_PATH,
  filter = "overdue",
}: FollowUpListProps) {
  const canAssign = canAssignProp ?? Boolean(storeId);
  const copy = content.staff.followUps;
  const followUpsBasePath = `${backHref}/follow-ups`;

  const queryParams = useMemo(() => {
    if (filter === "overdue") {
      return { overdue: true as const, storeId };
    }
    if (filter === "due_today") {
      return { filter: "due_today" as const, storeId };
    }
    return { filter: "open" as const, storeId };
  }, [filter, storeId]);

  const { data, isLoading, isError, error, refetch } = useFollowUps(queryParams);
  const callFlow = useStaffCallFlow(storeId);

  const emptyMessage =
    filter === "due_today"
      ? copy.emptyDueToday
      : filter === "open"
        ? copy.emptyOpen
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

      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label={copy.title}
      >
        {filters.map((item) => {
          const isActive = filter === item;
          const href = buildFollowUpsHref(followUpsBasePath, item);
          return (
            <Link
              key={item}
              href={href}
              role="tab"
              aria-selected={isActive}
              className={cn(
                "rounded-chip px-3 py-1.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-brand-gold text-white"
                  : "bg-surface-secondary text-text-secondary hover:text-brand-gold",
              )}
            >
              {copy.filters[item]}
            </Link>
          );
        })}
      </div>

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
              <li key={item.id}>
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
        onSubmit={(payload) =>
          callFlow.submitCallOutcome(payload, () => void refetch())
        }
      />
    </div>
  );
}

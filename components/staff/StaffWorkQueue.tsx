"use client";

import Link from "next/link";
import { Phone } from "lucide-react";
import { content } from "@/content/en";
import { useStaffWorkQueue } from "@/hooks/useStaffWorkQueue";
import { useStaffCallFlow } from "@/hooks/useStaffCallFlow";
import { STAFF_DASHBOARD_PATH } from "@/lib/auth/routes";
import { getPortalErrorMessage } from "@/lib/utils/api-error-message";
import { buildFollowUpsHref } from "@/lib/utils/follow-ups-url";
import { buildStaffCallsSearchParams } from "@/lib/utils/staff-calls-url";
import { defaultStaffCallsParams } from "@/lib/query/initial-data";
import { QueryLoadState } from "@/components/shared/QueryLoadState";
import { FollowUpCard } from "@/components/staff/FollowUpCard";
import { StaffCallCard } from "@/components/shared/calls";
import { CallFeedbackDialog } from "@/components/staff/CallFeedbackDialog";
import { Button } from "@/components/ui/button";
import type { StaffWorkQueueReason } from "@/types/staff-work-queue";

const reasonLabels: Record<StaffWorkQueueReason, string> = {
  overdue_task: "Overdue task",
  due_today_task: "Due today",
  not_answered: "Did not answer",
  follow_up_call: "Follow-up call",
  birthday: "Birthday this month",
  anniversary: "Anniversary this month",
};

export function StaffWorkQueue() {
  const copy = content.staff.workQueue;
  const callsCopy = content.staff.calls;
  const { data, isLoading, isError, error, refetch } = useStaffWorkQueue(12);
  const callFlow = useStaffCallFlow();

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

  async function handleCallFromTask(followUpId: string, visitId?: string | null, fieldSaleId?: string | null) {
    await callFlow.openCallForRecord({
      visitId: visitId ?? undefined,
      fieldSaleId: fieldSaleId ?? undefined,
      callingKey: followUpId,
    });
  }

  return (
    <section className="rounded-card border border-border bg-surface-card shadow-card">
      <div className="border-b border-border px-4 py-4 sm:px-5">
        <h2 className="font-display text-lg font-semibold text-text-primary">{copy.title}</h2>
        <p className="mt-1 text-sm text-text-muted">{copy.subtitle}</p>
      </div>

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
          <div className="space-y-3 p-4 sm:p-5">
            {data.items.map((item) => (
              <div key={item.id} className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-brand-gold">
                  {reasonLabels[item.reason]}
                </p>
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
            ))}
            {data.total > data.items.length ? (
              <p className="text-xs text-text-muted">
                {copy.previewHint
                  .replace("{shown}", String(data.items.length))
                  .replace("{total}", String(data.total))}
              </p>
            ) : null}
          </div>
        )}
      </QueryLoadState>

      <div className="flex flex-wrap gap-2 border-t border-border px-4 py-3 sm:px-5">
        <Button asChild variant="outline" size="sm">
          <Link href={buildFollowUpsHref(`${STAFF_DASHBOARD_PATH}/follow-ups`, "due_today")}>
            {copy.viewTasks}
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link
            href={`${STAFF_DASHBOARD_PATH}/calls?${buildStaffCallsSearchParams({
              ...defaultStaffCallsParams(),
              queue: "NOT_ANSWERED",
            })}`}
          >
            <Phone className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            {copy.viewCalls}
          </Link>
        </Button>
      </div>

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
    </section>
  );
}

"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { content } from "@/content/en";
import { useFollowUps } from "@/hooks/useFollowUps";
import { STAFF_DASHBOARD_PATH } from "@/lib/auth/routes";
import { formatDate } from "@/lib/utils/formatters";
import { QueryLoadState } from "@/components/shared/QueryLoadState";
import { AssignStaffButton } from "@/components/shared/AssignStaffDialog";
import { Badge } from "@/components/ui/badge";
import type { FollowUpListItem } from "@/types";

function followUpAssignTarget(item: FollowUpListItem) {
  if (item.visitId) return { visitId: item.visitId };
  if (item.fieldSaleId) return { fieldSaleId: item.fieldSaleId };
  return { followUpId: item.id };
}

interface FollowUpListProps {
  storeId?: string;
  canAssign?: boolean;
  backHref?: string;
}

export function FollowUpList({
  storeId,
  canAssign: canAssignProp,
  backHref = STAFF_DASHBOARD_PATH,
}: FollowUpListProps) {
  const canAssign = canAssignProp ?? Boolean(storeId);
  const { data, isLoading, isError, refetch } = useFollowUps({
    overdue: true,
    storeId,
  });
  const copy = content.staff.followUps;

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
        </div>
      </div>

      <QueryLoadState
        isLoading={isLoading}
        isError={isError}
        errorLabel={content.common.noResults}
        retryLabel={content.common.confirm}
        onRetry={() => void refetch()}
      >
        {!data?.length ? (
          <p className="text-sm text-text-secondary">{copy.empty}</p>
        ) : (
          <ul className="space-y-3">
            {data.map((item) => (
              <li
                key={item.id}
                className="rounded-card border border-border bg-surface-card p-4 shadow-card"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-text-primary">{item.customerName}</p>
                    <p className="text-sm text-text-secondary">{item.customerPhone}</p>
                    <p className="mt-1 text-xs text-text-muted">
                      {copy.assignedLabel}: {item.assignedStaffName}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{item.status}</Badge>
                    {canAssign && storeId ? (
                      <AssignStaffButton
                        storeId={storeId}
                        target={followUpAssignTarget(item)}
                        customerName={item.customerName}
                        currentStaffId={item.assignedStaffId}
                        currentStaffName={item.assignedStaffName}
                        onAssigned={() => void refetch()}
                        size="sm"
                      />
                    ) : null}
                  </div>
                </div>
                <p className="mt-2 text-sm text-text-muted">
                  {copy.dueLabel}: {formatDate(item.followUpDate)}
                </p>
                <p className="text-sm text-text-secondary">{item.reason}</p>
              </li>
            ))}
          </ul>
        )}
      </QueryLoadState>
    </div>
  );
}

"use client";

import { Phone } from "lucide-react";
import { content } from "@/content/en";
import { formatDate } from "@/lib/utils/formatters";
import { AssignStaffButton } from "@/components/shared/AssignStaffDialog";
import { FollowUpStatusMenu } from "@/components/staff/FollowUpStatusMenu";
import { Button } from "@/components/ui/button";
import type { FollowUpQuery } from "@/hooks/useFollowUps";
import type { FollowUpListItem } from "@/types";
import type { AssignCustomerTarget } from "@/components/shared/AssignStaffDialog";

function followUpAssignTarget(item: FollowUpListItem): AssignCustomerTarget {
  if (item.visitId) return { visitId: item.visitId };
  if (item.fieldSaleId) return { fieldSaleId: item.fieldSaleId };
  return { followUpId: item.id };
}

interface FollowUpCardProps {
  item: FollowUpListItem;
  storeId?: string;
  canAssign?: boolean;
  listParams?: FollowUpQuery;
  onUpdated?: () => void;
  onCall?: (item: FollowUpListItem) => void;
  isCalling?: boolean;
}

export function FollowUpCard({
  item,
  storeId,
  canAssign = false,
  listParams,
  onUpdated,
  onCall,
  isCalling = false,
}: FollowUpCardProps) {
  const copy = content.staff.followUps;
  const canCall = Boolean(onCall && (item.visitId || item.fieldSaleId));

  return (
    <article className="rounded-card border border-border bg-surface-card p-4 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium text-text-primary">{item.customerName}</p>
          <p className="text-sm text-text-secondary">{item.customerPhone}</p>
          <p className="mt-1 text-xs text-text-muted">
            {copy.assignedLabel}: {item.assignedStaffName}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canCall ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1.5"
              disabled={isCalling}
              onClick={() => onCall?.(item)}
            >
              <Phone className="h-3.5 w-3.5" aria-hidden />
              {copy.callCustomer}
            </Button>
          ) : null}
          <FollowUpStatusMenu
            item={item}
            storeId={storeId}
            listParams={listParams}
            onUpdated={onUpdated}
          />
          {canAssign && storeId ? (
            <AssignStaffButton
              storeId={storeId}
              target={followUpAssignTarget(item)}
              customerName={item.customerName}
              currentStaffId={item.assignedStaffId}
              currentStaffName={item.assignedStaffName}
              onAssigned={onUpdated}
              size="sm"
            />
          ) : null}
        </div>
      </div>
      <p className="mt-2 text-sm text-text-muted">
        {copy.dueLabel}: {formatDate(item.followUpDate)}
      </p>
      {item.reason ? (
        <p className="text-sm text-text-secondary">{item.reason}</p>
      ) : null}
    </article>
  );
}

"use client";

import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AssignStaffButton } from "@/components/shared/AssignStaffDialog";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils/formatters";
import { badgeClass, getCallOutcomeKey } from "./call-badge-utils";
import type { StaffCallListItem } from "@/types";
import type { AssignCustomerTarget } from "@/components/shared/AssignStaffDialog";

function assignTargetFromCallItem(item: StaffCallListItem): AssignCustomerTarget {
  if (item.visitId) return { visitId: item.visitId };
  if (item.fieldSaleId) return { fieldSaleId: item.fieldSaleId };
  if (item.followUpId) return { followUpId: item.followUpId };
  return { visitId: item.recordId };
}

interface StaffCallCardLabels {
  valueTierLabels: Record<string, string>;
  queueStatusLabels: Record<string, string>;
  masterSourceLabels: Record<string, string>;
  callOutcomeLabels: Record<string, string>;
  purchaseStatusLabels: Record<string, string>;
  customerTypeLabels: Record<string, string>;
  notesLabel: string;
  due: string;
  call: string;
  noPhone: string;
}

interface StaffCallCardProps {
  item: StaffCallListItem;
  labels: StaffCallCardLabels;
  onCall: (item: StaffCallListItem) => void;
  canAssign?: boolean;
  storeId?: string;
  onAssigned?: () => void;
}

export function StaffCallCard({
  item,
  labels,
  onCall,
  canAssign = false,
  storeId,
  onAssigned,
}: StaffCallCardProps) {
  const callOutcomeKey = getCallOutcomeKey(item.lastCallStatus);
  const isFollowUp = item.queue === "FOLLOW_UP";

  return (
    <article
      className={cn(
        "rounded-card border bg-surface-card p-4 shadow-card",
        isFollowUp ? "border-brand-gold/40" : "border-border",
      )}
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h2 className="font-display text-lg font-semibold text-text-primary">
              {item.displayName}
            </h2>
            <p className="text-sm text-text-secondary">{item.visitSummary}</p>
          </div>
          <div className="flex shrink-0 items-start gap-2">
            {isFollowUp && (
              <Badge variant="default" className="shrink-0">
                {labels.queueStatusLabels.FOLLOW_UP}
              </Badge>
            )}
            {canAssign && storeId ? (
              <AssignStaffButton
                storeId={storeId}
                target={assignTargetFromCallItem(item)}
                customerName={item.displayName}
                currentStaffId={item.staffId}
                currentStaffName={item.staffName}
                onAssigned={onAssigned}
                size="icon"
                variant="outline"
              />
            ) : null}
            <Button
              type="button"
              size="icon"
              className="h-10 w-10 shrink-0 rounded-full"
              disabled={!item.canCall}
              aria-label={item.canCall ? labels.call : labels.noPhone}
              title={item.canCall ? labels.call : labels.noPhone}
              onClick={() => onCall(item)}
            >
              <Phone className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="secondary">
            {labels.masterSourceLabels[item.masterSource]}
          </Badge>
          {item.staffName ? (
            <Badge variant="outline">{item.staffName}</Badge>
          ) : null}
          <Badge variant="outline" className={cn(badgeClass("value", item.valueTier))}>
            {labels.valueTierLabels[item.valueTier]}
          </Badge>
          <Badge variant="outline" className={cn(badgeClass("callOutcome", callOutcomeKey))}>
            {labels.callOutcomeLabels[callOutcomeKey]}
          </Badge>
          <Badge variant="outline" className={cn(badgeClass("status", item.purchaseStatus))}>
            {labels.purchaseStatusLabels[item.purchaseStatus]}
          </Badge>
          <Badge variant="secondary">{labels.customerTypeLabels[item.customerType]}</Badge>
          <Badge variant="secondary">{item.visitDateLabel}</Badge>
          {item.followUpDueDate && isFollowUp && (
            <Badge variant="outline" className="border-status-warning text-status-warning">
              {labels.due} {formatDate(item.followUpDueDate)}
            </Badge>
          )}
        </div>

        {item.notes && (
          <div className="border-t border-border pt-2">
            <p className="text-sm text-text-secondary">
              <span className="font-medium text-text-primary">{labels.notesLabel}: </span>
              {item.notes}
            </p>
          </div>
        )}
      </div>
    </article>
  );
}

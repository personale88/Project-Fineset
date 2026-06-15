import { Badge } from "@/components/ui/badge";
import { AssignStaffButton } from "@/components/shared/AssignStaffDialog";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import { formatLabel } from "./call-badge-utils";
import type { FieldSaleListItem } from "@/types";

interface FieldSaleCardLabels {
  staff: string;
  followUpDue: string;
  schemes: string;
  reason: string;
  notesLabel: string;
}

interface FieldSaleCardProps {
  item: FieldSaleListItem;
  labels: FieldSaleCardLabels;
  showStoreName?: boolean;
  canAssign?: boolean;
  onAssigned?: () => void;
}

export function FieldSaleCard({
  item,
  labels,
  showStoreName = false,
  canAssign = false,
  onAssigned,
}: FieldSaleCardProps) {
  return (
    <article className="rounded-card border border-border bg-surface-card p-4 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium text-text-primary">{item.customerName}</p>
          <p className="text-sm text-text-muted">{item.customerPhone}</p>
          <p className="mt-1 text-xs text-text-muted">
            {labels.staff}: {item.staffName}
            {showStoreName ? ` · ${item.storeName}` : ""}
          </p>
        </div>
        <div className="text-right text-xs text-text-muted">
          <p>{item.activityDateLabel}</p>
          {item.locationLabel && <p>{item.locationLabel}</p>}
          {canAssign ? (
            <div className="mt-2 flex justify-end">
              <AssignStaffButton
                storeId={item.storeId}
                target={{ fieldSaleId: item.id }}
                customerName={item.customerName}
                currentStaffId={item.staffId}
                currentStaffName={item.staffName}
                onAssigned={onAssigned}
                size="sm"
              />
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Badge variant="secondary">{formatLabel(item.activityType)}</Badge>
        {item.enrollmentOutcome && (
          <Badge variant="default">{formatLabel(item.enrollmentOutcome)}</Badge>
        )}
        {item.monthlyCommitment != null && (
          <Badge variant="success">{formatCurrency(item.monthlyCommitment)}/mo</Badge>
        )}
        {item.followUpNeeded && item.followUpDate && (
          <Badge variant="warning">
            {labels.followUpDue}: {formatDate(item.followUpDate)}
          </Badge>
        )}
      </div>

      {item.schemesPitched.length > 0 && (
        <p className="mt-2 text-sm text-text-secondary">
          {labels.schemes}: {item.schemesPitched.map(formatLabel).join(", ")}
        </p>
      )}

      {item.reasonNoEnrollment && (
        <p className="mt-1 text-sm text-text-muted">
          {labels.reason}: {formatLabel(item.reasonNoEnrollment)}
        </p>
      )}

      {item.staffNotes && (
        <div className="mt-3 border-t border-border pt-3">
          <p className="text-xs font-medium text-text-muted">{labels.notesLabel}</p>
          <p className="mt-1 text-sm text-text-secondary">{item.staffNotes}</p>
        </div>
      )}
    </article>
  );
}

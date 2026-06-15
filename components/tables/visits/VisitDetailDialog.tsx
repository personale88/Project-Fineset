import type { ReactNode } from "react";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatDurationMins,
  maskPhone,
} from "@/lib/utils/formatters";
import { boolLabel, formatProducts, labelFor } from "@/lib/utils/visit-display";
import type { VisitListItem } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AssignStaffButton } from "@/components/shared/AssignStaffDialog";
import type { VisitFormFields, VisitsCopy } from "./types";

interface VisitDetailDialogProps {
  visit: VisitListItem | null;
  copy: VisitsCopy;
  fieldLabels: VisitFormFields;
  productLabels: Record<string, string>;
  yesLabel: string;
  noLabel: string;
  onClose: () => void;
  canAssign?: boolean;
  storeId?: string;
  onAssigned?: () => void;
}

export function VisitDetailDialog({
  visit,
  copy,
  fieldLabels,
  productLabels,
  yesLabel,
  noLabel,
  onClose,
  canAssign = false,
  storeId,
  onAssigned,
}: VisitDetailDialogProps) {
  return (
    <Dialog open={visit !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{copy.detailTitle}</DialogTitle>
        </DialogHeader>
        {visit && (
          <div className="space-y-6 text-sm">
            <DetailSection title={copy.sections.customer}>
              <DetailRow
                label={copy.columns.date}
                value={formatDateTime(visit.visitDate)}
              />
              <DetailRow label={copy.columns.customer} value={visit.customerName} />
              <DetailRow
                label={copy.columns.phone}
                value={maskPhone(visit.customerPhone)}
              />
              <DetailRow
                label={copy.columns.customerType}
                value={labelFor(fieldLabels.customerType.options, visit.customerType)}
              />
              <DetailRow
                label={copy.columns.type}
                value={labelFor(fieldLabels.visitType.options, visit.visitType)}
              />
              <DetailRow
                label={copy.columns.inTime}
                value={visit.inTime ? formatDateTime(visit.inTime) : "—"}
              />
              <DetailRow
                label={copy.columns.outTime}
                value={visit.outTime ? formatDateTime(visit.outTime) : "—"}
              />
              <DetailRow
                label={copy.columns.duration}
                value={
                  visit.durationMins != null
                    ? formatDurationMins(visit.durationMins)
                    : "—"
                }
              />
              <DetailRow
                label={copy.columns.sourceChannel}
                value={labelFor(
                  fieldLabels.sourceChannel.options,
                  visit.sourceChannel,
                )}
              />
              <DetailRow label={copy.columns.area} value={visit.area ?? "—"} />
              <DetailRow
                label={copy.columns.gender}
                value={labelFor(fieldLabels.gender.options, visit.gender)}
              />
              <DetailRow
                label={copy.columns.ageGroup}
                value={labelFor(fieldLabels.ageGroup.options, visit.ageGroup)}
              />
              <DetailRow label={copy.columns.staff} value={visit.staffName} />
            </DetailSection>

            <DetailSection title={copy.sections.visit}>
              <DetailRow
                label={copy.columns.status}
                value={labelFor(
                  fieldLabels.purchaseStatus.options,
                  visit.purchaseStatus,
                )}
              />
              <DetailRow
                label={copy.columns.productsExplored}
                value={formatProducts(visit.productsExplored, productLabels)}
              />
              <DetailRow
                label={copy.columns.productsPurchased}
                value={formatProducts(visit.productsPurchased, productLabels)}
              />
              <DetailRow
                label={copy.columns.revenue}
                value={
                  visit.transactionAmount
                    ? formatCurrency(visit.transactionAmount)
                    : "—"
                }
              />
              <DetailRow
                label={copy.columns.intentTier}
                value={labelFor(fieldLabels.intentTier.options, visit.intentTier)}
              />
            </DetailSection>

            {visit.purchaseStatus === "NOT_PURCHASED" && (
              <DetailSection title={copy.sections.noPurchase}>
                <DetailRow
                  label={copy.columns.reasonNoPurchase}
                  value={labelFor(
                    fieldLabels.reasonNoPurchase.options,
                    visit.reasonNoPurchase,
                  )}
                />
                <DetailRow
                  label={copy.columns.competitorMention}
                  value={visit.competitorMention ?? "—"}
                />
              </DetailSection>
            )}

            <DetailSection title={copy.sections.preferences}>
              <DetailRow
                label={copy.columns.purchaseOccasion}
                value={labelFor(
                  fieldLabels.purchaseOccasion.options,
                  visit.purchaseOccasion,
                )}
              />
              <DetailRow
                label={copy.columns.metalKtPref}
                value={labelFor(fieldLabels.metalKtPref.options, visit.metalKtPref)}
              />
              <DetailRow
                label={copy.columns.budgetStated}
                value={labelFor(
                  fieldLabels.budgetStated.options,
                  visit.budgetStated,
                )}
              />
              <DetailRow
                label={copy.columns.schemeEnrolled}
                value={boolLabel(visit.schemeEnrolled, yesLabel, noLabel)}
              />
              <DetailRow
                label={copy.columns.ghsPolicy}
                value={boolLabel(visit.ghsPolicy, yesLabel, noLabel)}
              />
            </DetailSection>

            <DetailSection title={copy.sections.followUp}>
              <DetailRow
                label={copy.columns.followUp}
                value={boolLabel(visit.followUpNeeded, yesLabel, noLabel)}
              />
              <DetailRow
                label={copy.columns.followUpDate}
                value={visit.followUpDate ? formatDate(visit.followUpDate) : "—"}
              />
              <DetailRow
                label={copy.columns.followUpStatus}
                value={visit.followUpStatus ?? "—"}
              />
              <DetailRow
                label={copy.columns.notes}
                value={visit.staffNotes ?? "—"}
              />
            </DetailSection>
          </div>
        )}
        {visit && canAssign && storeId ? (
          <div className="flex justify-end border-t border-border pt-4">
            <AssignStaffButton
              storeId={storeId}
              target={{ visitId: visit.id }}
              customerName={visit.customerName}
              currentStaffId={visit.staffId}
              currentStaffName={visit.staffName}
              onAssigned={onAssigned}
            />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-3 font-medium text-text-primary">{title}</h3>
      <dl className="grid gap-2">{children}</dl>
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-3 gap-2 border-b border-border pb-2 last:border-0">
      <dt className="font-medium text-text-secondary">{label}</dt>
      <dd className="col-span-2 text-text-primary">{value}</dd>
    </div>
  );
}

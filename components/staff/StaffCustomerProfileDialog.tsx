"use client";

import { Phone } from "lucide-react";
import { content } from "@/content/en";
import {
  CustomerProfileDialog,
  type CustomerProfileLookup,
} from "@/components/customers/CustomerProfileDialog";
import { CallFeedbackDialog } from "@/components/staff/CallFeedbackDialog";
import { useStaffCallFlow } from "@/hooks/useStaffCallFlow";
import { Button } from "@/components/ui/button";

interface StaffCustomerProfileDialogProps {
  lookup: CustomerProfileLookup | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeId?: string;
}

export function StaffCustomerProfileDialog({
  lookup,
  open,
  onOpenChange,
  storeId,
}: StaffCustomerProfileDialogProps) {
  const fieldLabels = content.visitForm.fields;
  const productLabels = fieldLabels.productsExplored.options;
  const callsCopy = content.staff.calls;
  const profileCopy = content.staff.customerProfile;

  const resolvedStoreId = storeId ?? lookup?.storeId;
  const callFlow = useStaffCallFlow(resolvedStoreId);

  const canCall =
    open &&
    lookup !== null &&
    Boolean(lookup.visitId || lookup.fieldSaleId || lookup.customerId);

  const headerActions = canCall ? (
    <Button
      type="button"
      size="sm"
      className="gap-1.5"
      disabled={callFlow.isCalling("profile")}
      onClick={() =>
        void callFlow.openCallForRecord({
          customerId: lookup?.customerId ?? undefined,
          visitId: lookup?.visitId ?? undefined,
          fieldSaleId: lookup?.fieldSaleId ?? undefined,
          storeId: resolvedStoreId,
          callingKey: "profile",
        })
      }
    >
      <Phone className="h-4 w-4" aria-hidden />
      {profileCopy.callCustomer}
    </Button>
  ) : null;

  return (
    <>
      <CustomerProfileDialog
        visit={null}
        lookup={open ? lookup : null}
        copy={content.store.visits.customerProfile}
        fieldLabels={fieldLabels}
        productLabels={productLabels}
        onClose={() => onOpenChange(false)}
        storeId={resolvedStoreId}
        headerActions={headerActions}
      />

      <CallFeedbackDialog
        copy={callsCopy}
        item={callFlow.activeItem}
        open={callFlow.dialogOpen}
        onOpenChange={callFlow.closeDialog}
        dialInfo={callFlow.revealPhone.data ?? null}
        isDialLoading={callFlow.revealPhone.isPending}
        isSubmitting={callFlow.submitOutcome.isPending}
        onSubmit={(payload) => callFlow.submitCallOutcome(payload)}
      />
    </>
  );
}

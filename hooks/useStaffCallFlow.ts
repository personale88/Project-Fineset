"use client";

import { useCallback, useState } from "react";
import { content } from "@/content/en";
import { resolveStaffCallRecordApi } from "@/lib/api/staff-calls";
import { getPortalErrorMessage } from "@/lib/utils/api-error-message";
import { toast } from "@/hooks/useToast";
import {
  useRevealStaffCallPhone,
  useSubmitStaffCallOutcome,
} from "@/hooks/useStaffCalls";
import type { StaffCallListItem } from "@/types";
import type { StaffCallOutcomeInput } from "@/lib/validations/staff-calls.schema";

interface ResolveStaffCallParams {
  customerId?: string;
  visitId?: string;
  fieldSaleId?: string;
  storeId?: string;
  callingKey?: string;
}

export function useStaffCallFlow(storeId?: string) {
  const [activeItem, setActiveItem] = useState<StaffCallListItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [callingKey, setCallingKey] = useState<string | null>(null);

  const revealPhone = useRevealStaffCallPhone();
  const submitOutcome = useSubmitStaffCallOutcome();

  const closeDialog = useCallback(
    (open: boolean) => {
      setDialogOpen(open);
      if (!open) {
        setActiveItem(null);
        revealPhone.reset();
      }
    },
    [revealPhone],
  );

  const isCalling = useCallback(
    (key: string) => callingKey === key,
    [callingKey],
  );

  const openCallForRecord = useCallback(
    async (params: ResolveStaffCallParams) => {
      const key =
        params.callingKey ??
        params.visitId ??
        params.fieldSaleId ??
        params.customerId ??
        "call";
      setCallingKey(key);

      try {
        const item = await resolveStaffCallRecordApi({
          ...params,
          storeId: params.storeId ?? storeId,
        });
        setActiveItem(item);
        setDialogOpen(true);
        revealPhone.reset();
        await revealPhone.mutateAsync({
          recordId: item.recordId,
          masterSource: item.masterSource,
          storeId: params.storeId ?? storeId,
        });
      } catch (error) {
        closeDialog(false);
        toast({
          title: getPortalErrorMessage(error, content.errors),
        });
      } finally {
        setCallingKey(null);
      }
    },
    [closeDialog, revealPhone, storeId],
  );

  function submitCallOutcome(payload: StaffCallOutcomeInput, onSuccess?: () => void) {
    if (!activeItem) return;

    submitOutcome.mutate(
      {
        ref: {
          recordId: activeItem.recordId,
          masterSource: activeItem.masterSource,
          storeId,
        },
        payload,
      },
      {
        onSuccess: () => {
          toast({ title: content.staff.calls.dialog.feedbackSaved });
          closeDialog(false);
          onSuccess?.();
        },
        onError: (error) => {
          toast({
            title: getPortalErrorMessage(error, content.errors),
          });
        },
      },
    );
  }

  return {
    activeItem,
    dialogOpen,
    closeDialog,
    openCallForRecord,
    revealPhone,
    submitOutcome,
    submitCallOutcome,
    isCalling,
  };
}

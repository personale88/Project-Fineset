"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { content } from "@/content/en";
import { amendStaffFieldSale, amendStaffVisit } from "@/lib/api/staff-portal";
import { invalidateEntities } from "@/lib/sync/invalidate-portal-data";
import { getPortalErrorMessage } from "@/lib/utils/api-error-message";
import { toast } from "@/hooks/useToast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface StaffAmendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recordType: "visit" | "field_sale";
  recordId: string;
  initial: {
    customerName: string;
    customerPhone: string;
    staffNotes: string | null;
    area?: string | null;
    locationLabel?: string | null;
  };
  onSaved?: () => void;
}

export function StaffAmendDialog({
  open,
  onOpenChange,
  recordType,
  recordId,
  initial,
  onSaved,
}: StaffAmendDialogProps) {
  const copy = content.staff.amend;
  const queryClient = useQueryClient();
  const [customerName, setCustomerName] = useState(initial.customerName);
  const [customerPhone, setCustomerPhone] = useState(initial.customerPhone);
  const [staffNotes, setStaffNotes] = useState(initial.staffNotes ?? "");
  const [area, setArea] = useState(initial.area ?? initial.locationLabel ?? "");

  const amendSyncKey = open ? `${recordId}-${initial.customerPhone}` : null;
  const [prevAmendSyncKey, setPrevAmendSyncKey] = useState<string | null>(null);
  if (amendSyncKey !== prevAmendSyncKey) {
    setPrevAmendSyncKey(amendSyncKey);
    if (open) {
      setCustomerName(initial.customerName);
      setCustomerPhone(initial.customerPhone);
      setStaffNotes(initial.staffNotes ?? "");
      setArea(initial.area ?? initial.locationLabel ?? "");
    }
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        staffNotes: staffNotes.trim() || undefined,
        ...(recordType === "visit"
          ? { area: area.trim() || undefined }
          : { locationLabel: area.trim() || undefined }),
      };

      if (recordType === "visit") {
        return amendStaffVisit(recordId, payload);
      }
      return amendStaffFieldSale(recordId, payload);
    },
    onSuccess: () => {
      void invalidateEntities(
        queryClient,
        recordType === "visit"
          ? ["visits", "customers", "followUps"]
          : ["fieldSales", "customers", "followUps"],
      );
      toast({ title: copy.success });
      onOpenChange(false);
      onSaved?.();
    },
    onError: (error) => {
      toast({ title: getPortalErrorMessage(error, content.errors) });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amend-customer-name">{copy.customerName}</Label>
            <Input
              id="amend-customer-name"
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amend-customer-phone">{copy.customerPhone}</Label>
            <Input
              id="amend-customer-phone"
              value={customerPhone}
              onChange={(event) => setCustomerPhone(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amend-area">{recordType === "visit" ? copy.area : "Location"}</Label>
            <Input
              id="amend-area"
              value={area}
              onChange={(event) => setArea(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amend-notes">{copy.notes}</Label>
            <Textarea
              id="amend-notes"
              value={staffNotes}
              onChange={(event) => setStaffNotes(event.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {content.common.cancel}
          </Button>
          <Button
            type="button"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? copy.saving : copy.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

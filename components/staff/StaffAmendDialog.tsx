"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { content } from "@/content/en";
import { amendStaffFieldSale, amendStaffVisit } from "@/lib/api/staff-portal";
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
  const [customerName, setCustomerName] = useState(initial.customerName);
  const [customerPhone, setCustomerPhone] = useState(initial.customerPhone);
  const [staffNotes, setStaffNotes] = useState(initial.staffNotes ?? "");
  const [area, setArea] = useState(initial.area ?? initial.locationLabel ?? "");

  useEffect(() => {
    if (!open) return;
    setCustomerName(initial.customerName);
    setCustomerPhone(initial.customerPhone);
    setStaffNotes(initial.staffNotes ?? "");
    setArea(initial.area ?? initial.locationLabel ?? "");
  }, [open, initial]);

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
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="amend-name">{copy.customerName}</Label>
            <Input id="amend-name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="amend-phone">{copy.customerPhone}</Label>
            <Input id="amend-phone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="amend-area">{recordType === "visit" ? copy.area : copy.location}</Label>
            <Input id="amend-area" value={area} onChange={(e) => setArea(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="amend-notes">{copy.notes}</Label>
            <Textarea id="amend-notes" value={staffNotes} onChange={(e) => setStaffNotes(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {content.common.cancel}
          </Button>
          <Button type="button" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? copy.saving : copy.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

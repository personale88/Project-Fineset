"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCreateLocationException } from "@/hooks/useLocationExceptions";
import { toast } from "@/hooks/useToast";

interface StaffOption {
  id: string;
  name: string;
}

interface IssueGpsExceptionDialogCopy {
  trigger: string;
  title: string;
  description: string;
  staffLabel: string;
  recordTypeLabel: string;
  recordTypes: {
    fieldSale: string;
    visit: string;
  };
  reasonLabel: string;
  reasonPlaceholder: string;
  submit: string;
  submitting: string;
  success: string;
  failed: string;
}

interface IssueGpsExceptionDialogProps {
  copy: IssueGpsExceptionDialogCopy;
  staffOptions: StaffOption[];
}

export function IssueGpsExceptionDialog({ copy, staffOptions }: IssueGpsExceptionDialogProps) {
  const [open, setOpen] = useState(false);
  const [staffId, setStaffId] = useState(staffOptions[0]?.id ?? "");
  const [recordType, setRecordType] = useState<"FIELD_SALE" | "VISIT">("FIELD_SALE");
  const [reason, setReason] = useState("");
  const mutation = useCreateLocationException();

  async function handleSubmit() {
    if (!staffId) return;
    try {
      await mutation.mutateAsync({
        staffId,
        recordType,
        reason: reason.trim() || undefined,
      });
      toast({ title: copy.success });
      setOpen(false);
      setReason("");
    } catch {
      toast({ title: copy.failed });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          {copy.trigger}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{copy.staffLabel}</Label>
            <Select value={staffId} onValueChange={setStaffId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {staffOptions.map((staff) => (
                  <SelectItem key={staff.id} value={staff.id}>
                    {staff.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{copy.recordTypeLabel}</Label>
            <Select
              value={recordType}
              onValueChange={(value) => setRecordType(value as "FIELD_SALE" | "VISIT")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FIELD_SALE">{copy.recordTypes.fieldSale}</SelectItem>
                <SelectItem value="VISIT">{copy.recordTypes.visit}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{copy.reasonLabel}</Label>
            <Textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={copy.reasonPlaceholder}
              rows={3}
            />
          </div>
          <Button
            type="button"
            className="w-full"
            disabled={!staffId || mutation.isPending}
            onClick={() => void handleSubmit()}
          >
            {mutation.isPending ? copy.submitting : copy.submit}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

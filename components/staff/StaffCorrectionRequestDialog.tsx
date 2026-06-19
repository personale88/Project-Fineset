"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { content } from "@/content/en";
import { submitCorrectionRequest } from "@/lib/api/staff-portal";
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
import { Textarea } from "@/components/ui/textarea";

interface StaffCorrectionRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visitId?: string;
  fieldSaleId?: string;
  customerName: string;
}

export function StaffCorrectionRequestDialog({
  open,
  onOpenChange,
  visitId,
  fieldSaleId,
  customerName,
}: StaffCorrectionRequestDialogProps) {
  const copy = content.staff.correctionRequest;
  const [message, setMessage] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      submitCorrectionRequest({
        visitId,
        fieldSaleId,
        message: message.trim(),
      }),
    onSuccess: () => {
      toast({ title: copy.success });
      setMessage("");
      onOpenChange(false);
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
          <DialogDescription>
            {copy.description.replace("{name}", customerName)}
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={copy.placeholder}
          rows={4}
        />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {content.common.cancel}
          </Button>
          <Button
            type="button"
            disabled={message.trim().length < 10 || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? copy.sending : copy.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

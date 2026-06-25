"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils/formatters";
import type { BillingPaymentSubmissionDto } from "@/lib/api/billing";
import type { Content } from "@/content/en";

type PaymentsCopy = Content["admin"]["billing"]["payments"];

interface AdminPaymentReceivedConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submission: BillingPaymentSubmissionDto | null;
  copy: PaymentsCopy;
  isLoading?: boolean;
  onConfirm: () => void;
}

export function AdminPaymentReceivedConfirmDialog({
  open,
  onOpenChange,
  submission,
  copy,
  isLoading = false,
  onConfirm,
}: AdminPaymentReceivedConfirmDialogProps) {
  const invoice = submission?.invoiceNumber || copy.notAvailable;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.confirmReceivedTitle}</DialogTitle>
          <DialogDescription>{copy.confirmReceivedDescription}</DialogDescription>
        </DialogHeader>

        {submission ? (
          <dl className="space-y-2 rounded-input border border-border bg-surface-secondary/30 px-4 py-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              <dt className="text-text-muted">{copy.confirmReceivedBusiness}</dt>
              <dd className="text-right font-medium text-text-primary">{submission.businessName}</dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="text-text-muted">{copy.invoiceLabel}</dt>
              <dd className="text-right font-medium text-text-primary">{invoice}</dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="text-text-muted">{copy.amountLabel}</dt>
              <dd className="font-numeric text-right font-semibold tabular-nums text-text-primary">
                {formatCurrency(submission.amountInr)}
              </dd>
            </div>
          </dl>
        ) : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            {copy.confirmReceivedCancel}
          </Button>
          <Button
            type="button"
            className="bg-status-success text-white hover:bg-status-success/90"
            onClick={onConfirm}
            disabled={isLoading || !submission}
          >
            {isLoading ? copy.reviewing : copy.confirmReceivedAction}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

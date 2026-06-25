"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { PortalPayNowDto } from "@/lib/services/portal-billing-details";
import { UpiPayNowDialogActions } from "@/components/shared/UpiPayNowDialogActions";
import { UpiPayNowPaymentContent, UPI_PAY_NOW_QR_SIZE } from "@/components/shared/UpiPayNowPaymentContent";
import { usePaymentCountdown } from "@/hooks/usePaymentCountdown";
import type { Content } from "@/content/en";
import { ApiError } from "@/types";

type CreditsCopy = Content["admin"]["analytics"]["credits"];

interface AnalyticsCreditPayNowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  copy: CreditsCopy;
  payNow: PortalPayNowDto | null;
  isLoading: boolean;
  loadError: string | null;
  isSubmitting: boolean;
  onSubmitPayment: () => Promise<void>;
}

export function AnalyticsCreditPayNowDialog({
  open,
  onOpenChange,
  copy,
  payNow,
  isLoading,
  loadError,
  isSubmitting,
  onSubmitPayment,
}: AnalyticsCreditPayNowDialogProps) {
  const [completed, setCompleted] = useState(false);
  const [failedPrompt, setFailedPrompt] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [paymentSession, setPaymentSession] = useState(0);
  const countdownActive = open && !completed && !failedPrompt && Boolean(payNow?.available);
  const secondsLeft = usePaymentCountdown(
    countdownActive,
    payNow?.timerSeconds ?? 0,
    paymentSession,
  );
  const expired = secondsLeft <= 0;

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setCompleted(false);
      setFailedPrompt(false);
      setPaymentSession(0);
      setSubmitError(null);
    }
    onOpenChange(nextOpen);
  }

  async function copyUpiId() {
    if (!payNow?.upiVpa) return;
    try {
      await navigator.clipboard.writeText(payNow.upiVpa);
    } catch {
      // Clipboard may be unavailable in some browsers.
    }
  }

  function handleClose() {
    handleOpenChange(false);
  }

  async function handlePaymentCompleted() {
    setSubmitError(null);
    try {
      await onSubmitPayment();
      setCompleted(true);
      setFailedPrompt(false);
    } catch (error) {
      const message =
        error instanceof ApiError && error.body.message?.trim()
          ? error.body.message.trim()
          : copy.payNowSubmitFailed;
      setSubmitError(message);
    }
  }

  function handlePaymentFailed() {
    setFailedPrompt(true);
  }

  function handleTryAgain() {
    setFailedPrompt(false);
    setPaymentSession((session) => session + 1);
  }

  const unavailable = !isLoading && (!payNow || !payNow.available);
  const showFooter = !isLoading && !loadError && !unavailable && Boolean(payNow);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        hideCloseButton
        className="max-w-sm gap-0 overflow-hidden p-0"
        onInteractOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        <DialogHeader className="border-b border-border px-4 py-3 sm:px-5">
          <DialogTitle className="text-base">
            {completed
              ? copy.payNowDialogCompletedTitle
              : failedPrompt
                ? copy.payNowDialogFailedTitle
                : copy.payNowDialogTitle}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3 px-4 py-4 sm:px-5">
            <Skeleton className="mx-auto h-7 w-28" />
            <Skeleton className="mx-auto" style={{ width: UPI_PAY_NOW_QR_SIZE, height: UPI_PAY_NOW_QR_SIZE }} />
          </div>
        ) : loadError || unavailable ? (
          <div className="space-y-3 px-4 py-5 text-center sm:px-5">
            <p className="text-sm text-status-error">
              {loadError ?? copy.paymentNotConfigured}
            </p>
            <Button type="button" variant="outline" size="sm" onClick={handleClose}>
              {copy.payNowDialogClose}
            </Button>
          </div>
        ) : completed ? (
          <div className="space-y-3 px-4 py-5 text-center sm:px-5">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-status-success/10 text-status-success">
              <CheckCircle2 className="h-7 w-7" aria-hidden />
            </div>
            <p className="text-sm text-text-secondary">{copy.payNowDialogCompletedMessage}</p>
          </div>
        ) : failedPrompt ? (
          <div className="space-y-3 px-4 py-5 text-center sm:px-5">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-status-error/10 text-status-error">
              <AlertCircle className="h-7 w-7" aria-hidden />
            </div>
            <p className="text-sm text-text-secondary">{copy.payNowDialogFailedMessage}</p>
          </div>
        ) : payNow ? (
          <UpiPayNowPaymentContent
            copy={copy}
            payNow={payNow}
            expired={expired}
            secondsLeft={secondsLeft}
            onCopyUpi={() => void copyUpiId()}
          />
        ) : null}

        {showFooter ? (
          <UpiPayNowDialogActions
            copy={copy}
            completed={completed}
            failedPrompt={failedPrompt}
            submitting={isSubmitting}
            submitError={submitError}
            onClose={handleClose}
            onTryAgain={handleTryAgain}
            onPaymentFailed={handlePaymentFailed}
            onPaymentCompleted={() => void handlePaymentCompleted()}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

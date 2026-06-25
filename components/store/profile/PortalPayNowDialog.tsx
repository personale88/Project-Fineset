"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Copy, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { PortalPayNowDto } from "@/lib/services/portal-billing-details";
import { formatPaymentCountdown } from "@/lib/utils/upi-payment";
import { formatCurrency } from "@/lib/utils/formatters";
import { submitPortalPaymentSubmission, PortalBillingApiError } from "@/lib/api/portal-billing-details";
import type { ProfileCopy } from "@/components/store/profile/profile-scope";
import { UpiAppLogosRow } from "@/components/icons/upi-app-logos";

interface PortalPayNowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  copy: ProfileCopy["billing"];
  payNow: PortalPayNowDto;
}

function usePaymentCountdown(
  active: boolean,
  durationSeconds: number,
  sessionKey: number,
): number {
  const [secondsLeft, setSecondsLeft] = useState(durationSeconds);

  useEffect(() => {
    if (!active) {
      setSecondsLeft(durationSeconds);
      return;
    }

    setSecondsLeft(durationSeconds);
    const intervalId = window.setInterval(() => {
      setSecondsLeft((current) => (current <= 1 ? 0 : current - 1));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [active, durationSeconds, sessionKey]);

  return secondsLeft;
}

export function PortalPayNowDialog({
  open,
  onOpenChange,
  copy,
  payNow,
}: PortalPayNowDialogProps) {
  const [completed, setCompleted] = useState(false);
  const [failedPrompt, setFailedPrompt] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [paymentSession, setPaymentSession] = useState(0);
  const countdownActive = open && !completed && !failedPrompt;
  const secondsLeft = usePaymentCountdown(
    countdownActive,
    payNow.timerSeconds,
    paymentSession,
  );
  const expired = secondsLeft <= 0;
  const upiUri = payNow.href ?? "";

  useEffect(() => {
    if (!open) {
      setCompleted(false);
      setFailedPrompt(false);
      setPaymentSession(0);
      setSubmitting(false);
      setSubmitError(null);
    }
  }, [open]);

  async function copyUpiId() {
    if (!payNow.upiVpa) return;
    try {
      await navigator.clipboard.writeText(payNow.upiVpa);
    } catch {
      // Clipboard may be unavailable in some browsers.
    }
  }

  function handleClose() {
    onOpenChange(false);
  }

  async function handlePaymentCompleted() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await submitPortalPaymentSubmission();
      setCompleted(true);
      setFailedPrompt(false);
    } catch (error) {
      const message =
        error instanceof PortalBillingApiError
          ? error.message
          : copy.payNowSubmitFailed;
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  }

  function handlePaymentFailed() {
    setFailedPrompt(true);
  }

  function handleTryAgain() {
    setFailedPrompt(false);
    setPaymentSession((session) => session + 1);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton
        className="max-w-sm gap-0 overflow-hidden p-0"
        onInteractOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle>
            {completed
              ? copy.payNowDialogCompletedTitle
              : failedPrompt
                ? copy.payNowDialogFailedTitle
                : copy.payNowDialogTitle}
          </DialogTitle>
        </DialogHeader>

        {completed ? (
          <div className="space-y-4 px-5 py-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-status-success/10 text-status-success">
              <CheckCircle2 className="h-8 w-8" aria-hidden />
            </div>
            <p className="text-sm text-text-secondary">{copy.payNowDialogCompletedMessage}</p>
          </div>
        ) : failedPrompt ? (
          <div className="space-y-4 px-5 py-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-status-error/10 text-status-error">
              <AlertCircle className="h-8 w-8" aria-hidden />
            </div>
            <p className="text-sm text-text-secondary">{copy.payNowDialogFailedMessage}</p>
          </div>
        ) : (
          <div className="space-y-5 px-5 py-5">
            <div className="text-center">
              <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                {copy.payNowDialogAmountLabel}
              </p>
              <p className="mt-1 font-numeric text-3xl font-semibold tabular-nums text-text-primary">
                {formatCurrency(payNow.amountInr)}
              </p>
              <p className="mt-1 text-xs text-text-muted">{copy.payNowDialogAmountHint}</p>
              <p
                className={cn(
                  "mt-2 text-sm",
                  expired ? "text-status-error" : "text-status-warning",
                )}
              >
                {expired
                  ? copy.payNowDialogExpired
                  : copy.payNowDialogTimer.replace(
                      "{time}",
                      formatPaymentCountdown(secondsLeft),
                    )}
              </p>
            </div>

            <div
              className={cn(
                "mx-auto flex w-fit flex-col items-center rounded-input border border-border bg-white p-0.5 shadow-sm",
                expired && "opacity-50",
              )}
            >
              {upiUri ? (
                <QRCodeSVG value={upiUri} size={192} level="M" includeMargin />
              ) : (
                <div className="flex h-48 w-48 items-center justify-center text-text-muted">
                  <QrCode className="h-12 w-12" aria-hidden />
                </div>
              )}
            </div>

            <div className="space-y-3 text-center">
              <p className="text-sm font-medium text-text-primary">{copy.payNowDialogScanHint}</p>
              <UpiAppLogosRow />
              {payNow.upiVpa ? (
                <div className="flex items-center justify-center gap-2">
                  <p className="font-mono text-sm text-text-secondary">{payNow.upiVpa}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => void copyUpiId()}
                    aria-label={copy.payNowDialogCopyUpi}
                  >
                    <Copy className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                </div>
              ) : null}
              {payNow.upiPayeeName ? (
                <p className="text-xs text-text-muted">
                  {copy.payNowDialogPayee.replace("{name}", payNow.upiPayeeName)}
                </p>
              ) : null}
              {payNow.invoiceRef ? (
                <p className="text-xs text-text-muted">
                  {copy.payNowDialogReference.replace("{ref}", payNow.invoiceRef)}
                </p>
              ) : null}
            </div>

            <p className="text-center text-xs text-text-muted">{copy.payNowDialogFooter}</p>
          </div>
        )}

        <DialogFooter className="gap-2 border-t border-border px-5 py-4 sm:flex-row sm:justify-stretch">
          {completed ? (
            <Button type="button" className="w-full" onClick={handleClose}>
              {copy.payNowDialogClose}
            </Button>
          ) : failedPrompt ? (
            <>
              <Button
                type="button"
                variant="outline"
                className="w-full sm:flex-1"
                onClick={handleClose}
              >
                {copy.payNowDialogClose}
              </Button>
              <Button type="button" className="w-full sm:flex-1" onClick={handleTryAgain}>
                {copy.payNowDialogTryAgain}
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                className="w-full sm:flex-1"
                onClick={handlePaymentFailed}
              >
                {copy.payNowDialogPaymentFailed}
              </Button>
              <Button
                type="button"
                className="w-full sm:flex-1 bg-status-success text-white shadow-sm hover:bg-status-success/90"
                disabled={submitting}
                onClick={() => void handlePaymentCompleted()}
              >
                {submitting ? copy.payNowSubmitting : copy.payNowDialogPaymentCompleted}
              </Button>
              {submitError ? (
                <p className="w-full text-center text-xs text-status-error">{submitError}</p>
              ) : null}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

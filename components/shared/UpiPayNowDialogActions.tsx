import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface UpiPayNowActionsCopy {
  payNowDialogTitle: string;
  payNowDialogClose: string;
  payNowDialogTryAgain: string;
  payNowDialogDoItLater: string;
  payNowDialogPaymentFailed: string;
  payNowDialogPaymentCompleted: string;
  payNowSubmitting: string;
}

interface UpiPayNowDialogActionsProps {
  copy: UpiPayNowActionsCopy;
  completed: boolean;
  failedPrompt: boolean;
  submitting: boolean;
  submitError: string | null;
  onClose: () => void;
  onTryAgain: () => void;
  onPaymentFailed: () => void;
  onPaymentCompleted: () => void;
}

export function UpiPayNowDialogActions({
  copy,
  completed,
  failedPrompt,
  submitting,
  submitError,
  onClose,
  onTryAgain,
  onPaymentFailed,
  onPaymentCompleted,
}: UpiPayNowDialogActionsProps) {
  return (
    <div
      role="group"
      aria-label={copy.payNowDialogTitle}
      className="flex flex-col gap-1.5 border-t border-border px-4 py-3 sm:px-5"
    >
      {completed ? (
        <Button type="button" size="sm" className="w-full" onClick={onClose}>
          {copy.payNowDialogClose}
        </Button>
      ) : failedPrompt ? (
        <div className="flex w-full gap-2">
          <Button type="button" variant="outline" size="sm" className="min-w-0 flex-1" onClick={onClose}>
            {copy.payNowDialogClose}
          </Button>
          <Button type="button" size="sm" className="min-w-0 flex-1" onClick={onTryAgain}>
            {copy.payNowDialogTryAgain}
          </Button>
        </div>
      ) : (
        <>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-full text-text-muted hover:text-text-secondary"
            disabled={submitting}
            onClick={onClose}
          >
            {copy.payNowDialogDoItLater}
          </Button>
          <div className="flex w-full gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-w-0 flex-1"
              onClick={onPaymentFailed}
            >
              {copy.payNowDialogPaymentFailed}
            </Button>
            <Button
              type="button"
              size="sm"
              className={cn(
                "min-w-0 flex-1 bg-status-success text-white shadow-sm hover:bg-status-success/90",
              )}
              disabled={submitting}
              onClick={onPaymentCompleted}
            >
              {submitting ? copy.payNowSubmitting : copy.payNowDialogPaymentCompleted}
            </Button>
          </div>
          {submitError ? (
            <p className="w-full text-center text-xs text-status-error">{submitError}</p>
          ) : null}
        </>
      )}
    </div>
  );
}

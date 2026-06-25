import { Copy, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { UpiAppLogosRow } from "@/components/icons/upi-app-logos";
import { UpiPayNowFooterNotice } from "@/components/shared/UpiPayNowFooterNotice";
import { cn } from "@/lib/utils";
import type { PortalPayNowDto } from "@/lib/services/portal-billing-details";
import { formatPaymentCountdown } from "@/lib/utils/upi-payment";
import { formatCurrency } from "@/lib/utils/formatters";

/** Scannable on phone screens while keeping the modal compact. */
export const UPI_PAY_NOW_QR_SIZE = 156;

export interface UpiPayNowPaymentCopy {
  payNowDialogAmountLabel: string;
  payNowDialogAmountHint: string;
  payNowDialogTimer: string;
  payNowDialogExpired: string;
  payNowDialogScanHint: string;
  payNowDialogCopyUpi: string;
  payNowDialogPayee: string;
  payNowDialogReference: string;
  payNowDialogFooterTitle: string;
  payNowDialogFooter: string;
}

interface UpiPayNowPaymentContentProps {
  copy: UpiPayNowPaymentCopy;
  payNow: PortalPayNowDto;
  expired: boolean;
  secondsLeft: number;
  onCopyUpi: () => void;
}

export function UpiPayNowPaymentContent({
  copy,
  payNow,
  expired,
  secondsLeft,
  onCopyUpi,
}: UpiPayNowPaymentContentProps) {
  const upiUri = payNow.href ?? "";

  return (
    <div className="space-y-3 px-4 py-3 sm:px-5 sm:py-3.5">
      <div className="text-center">
        <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">
          {copy.payNowDialogAmountLabel}
        </p>
        <p className="font-numeric text-2xl font-semibold tabular-nums leading-tight text-text-primary">
          {formatCurrency(payNow.amountInr)}
        </p>
        <p className="mt-0.5 text-[11px] text-text-muted">{copy.payNowDialogAmountHint}</p>
        <p
          className={cn(
            "mt-1 text-xs font-medium",
            expired ? "text-status-error" : "text-status-warning",
          )}
        >
          {expired
            ? copy.payNowDialogExpired
            : copy.payNowDialogTimer.replace("{time}", formatPaymentCountdown(secondsLeft))}
        </p>
      </div>

      <div
        className={cn(
          "mx-auto flex w-fit flex-col items-center",
          expired && "opacity-50",
        )}
      >
        {upiUri ? (
          <QRCodeSVG value={upiUri} size={UPI_PAY_NOW_QR_SIZE} level="M" includeMargin={false} />
        ) : (
          <div
            className="flex items-center justify-center text-text-muted"
            style={{ width: UPI_PAY_NOW_QR_SIZE, height: UPI_PAY_NOW_QR_SIZE }}
          >
            <QrCode className="h-10 w-10" aria-hidden />
          </div>
        )}
      </div>

      <div className="space-y-2 text-center">
        <p className="text-xs font-medium text-text-primary">{copy.payNowDialogScanHint}</p>
        <UpiAppLogosRow compact />
        {payNow.upiVpa ? (
          <div className="flex items-center justify-center gap-1.5">
            <p className="font-mono text-xs text-text-secondary">{payNow.upiVpa}</p>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={onCopyUpi}
              aria-label={copy.payNowDialogCopyUpi}
            >
              <Copy className="h-3 w-3" aria-hidden />
            </Button>
          </div>
        ) : null}
        {(payNow.upiPayeeName || payNow.invoiceRef) ? (
          <p className="text-[11px] leading-snug text-text-muted">
            {payNow.upiPayeeName
              ? copy.payNowDialogPayee.replace("{name}", payNow.upiPayeeName)
              : null}
            {payNow.upiPayeeName && payNow.invoiceRef ? (
              <span className="text-text-muted/60" aria-hidden>
                {" "}
                ·{" "}
              </span>
            ) : null}
            {payNow.invoiceRef
              ? copy.payNowDialogReference.replace("{ref}", payNow.invoiceRef)
              : null}
          </p>
        ) : null}
      </div>

      <UpiPayNowFooterNotice
        title={copy.payNowDialogFooterTitle}
        message={copy.payNowDialogFooter}
        compact
      />
    </div>
  );
}

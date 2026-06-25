"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDateTime } from "@/lib/utils/formatters";
import type { BillingPaymentSubmissionDto } from "@/lib/api/billing";
import type { Content } from "@/content/en";

type PaymentsCopy = Content["admin"]["billing"]["payments"];

function statusLabel(
  status: BillingPaymentSubmissionDto["status"],
  copy: PaymentsCopy,
): string {
  switch (status) {
    case "RECEIVED":
      return copy.statusReceived;
    case "NOT_RECEIVED":
      return copy.statusNotReceived;
    default:
      return copy.statusPending;
  }
}

function statusColor(status: BillingPaymentSubmissionDto["status"]): string {
  switch (status) {
    case "RECEIVED":
      return "text-status-success";
    case "NOT_RECEIVED":
      return "text-status-error";
    default:
      return "text-status-warning";
  }
}

function kindLabel(
  kind: BillingPaymentSubmissionDto["kind"],
  copy: PaymentsCopy,
): string {
  return kind === "ANALYTICS_CREDITS" ? copy.kindAnalyticsCredits : copy.kindSubscription;
}

interface AdminPaymentSubmissionCardProps {
  submission: BillingPaymentSubmissionDto;
  copy: PaymentsCopy;
  isReviewing: boolean;
  onReceivedClick: () => void;
  onNotReceivedClick: () => void;
}

export function AdminPaymentSubmissionCard({
  submission,
  copy,
  isReviewing,
  onReceivedClick,
  onNotReceivedClick,
}: AdminPaymentSubmissionCardProps) {
  const isPending = submission.status === "PENDING";
  const invoice = submission.invoiceNumber || copy.notAvailable;
  const detailParts = [
    submission.businessEmail || copy.noEmail,
    formatDateTime(submission.createdAt),
    submission.upiVpa ?? null,
  ].filter(Boolean);

  return (
    <div
      className={cn(
        "px-4 py-4 sm:px-5 sm:py-5",
        isPending && "border-l-2 border-l-status-warning bg-status-warning/[0.03]",
      )}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-sm leading-snug">
            <span className="truncate font-medium text-text-primary">
              {submission.businessName}
            </span>
            <span className="text-text-muted" aria-hidden>
              ·
            </span>
            <span className="truncate text-text-secondary">{invoice}</span>
            <span className="rounded-full bg-surface-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-text-muted">
              {kindLabel(submission.kind, copy)}
            </span>
          </div>
          <p className="mt-1 truncate text-xs text-text-muted">{detailParts.join(" · ")}</p>
          {!isPending && submission.reviewedAt ? (
            <p className="mt-1 truncate text-xs text-text-muted">
              {copy.reviewedAt
                .replace("{date}", formatDateTime(submission.reviewedAt))
                .replace("{email}", submission.reviewedByEmail || copy.notAvailable)}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 lg:justify-end">
          <div className="flex items-baseline gap-2 lg:flex-col lg:items-end lg:gap-0">
            <p className="font-numeric text-lg font-semibold tabular-nums leading-none text-text-primary">
              {formatCurrency(submission.amountInr)}
            </p>
            {!isPending ? (
              <p className={cn("text-xs font-medium lg:mt-1", statusColor(submission.status))}>
                {statusLabel(submission.status, copy)}
              </p>
            ) : (
              <p className="text-xs font-medium text-status-warning lg:mt-1">
                {copy.statusPending}
              </p>
            )}
          </div>

          {isPending ? (
            <div className="flex shrink-0 gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 px-3 text-xs"
                disabled={isReviewing}
                onClick={onNotReceivedClick}
              >
                {copy.paymentNotReceived}
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-9 bg-status-success px-3 text-xs text-white hover:bg-status-success/90"
                disabled={isReviewing}
                onClick={onReceivedClick}
              >
                {isReviewing ? copy.reviewing : copy.paymentReceived}
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

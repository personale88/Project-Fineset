"use client";

import { AlertTriangle } from "lucide-react";
import { useBillingAccessContext } from "@/components/billing/BillingAccessProvider";
import { content } from "@/content/en";
import { formatDate } from "@/lib/utils/formatters";

export function BillingAccessBanner() {
  const { access, isLoading, isRestricted } = useBillingAccessContext();
  const copy = content.billing.portal;

  if (isLoading || !isRestricted || !access) return null;

  const deadline = access.paymentDeadline
    ? formatDate(access.paymentDeadline)
    : access.paymentDeadlineFallback || copy.deadlineFallback;

  return (
    <div
      role="status"
      className="rounded-card border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-text-primary"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
        <div className="space-y-1">
          <p className="font-medium">{copy.restrictedTitle}</p>
          <p className="text-text-secondary">
            {copy.restrictedBody.replace("{deadline}", deadline)}
          </p>
          <p className="text-text-muted">{copy.restrictedEntryHint}</p>
        </div>
      </div>
    </div>
  );
}

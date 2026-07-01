"use client";

import { AlertTriangle, Info } from "lucide-react";
import { useBillingAccessContext } from "@/components/billing/BillingAccessProvider";
import { content } from "@/content/en";
import { formatDate } from "@/lib/utils/formatters";
import { resolvePortalBillingBanner } from "@/lib/utils/portal-billing-banner";
import { cn } from "@/lib/utils";

export function BillingAccessBanner() {
  const { access, isLoading } = useBillingAccessContext();
  const copy = content.billing.portal;

  if (isLoading || !access) return null;

  const deadline = access.paymentDeadline
    ? formatDate(access.paymentDeadline)
    : access.paymentDeadlineFallback || copy.deadlineFallback;

  const banner = resolvePortalBillingBanner({
    role: access.viewerRole,
    metricsBlurred: access.metricsBlurred,
    restrictionTier: access.restrictionTier as "NONE" | "METRICS_BLURRED_ALL" | "LEADERS_RESTRICTED_STAFF_OK",
    consecutiveUnpaidPeriods: access.consecutiveUnpaidPeriods,
    paymentDeadlineLabel: deadline,
    outstandingGrandTotal: access.outstandingGrandTotal,
    unpaidPeriodCount: access.unpaidPeriodCount,
    copy,
  });

  if (banner.showStaffInfoBanner) {
    return (
      <div
        role="status"
        className="rounded-card border border-border bg-surface-secondary/60 px-4 py-3 text-sm text-text-primary"
      >
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" aria-hidden />
          <div className="space-y-1">
            <p className="font-medium">{banner.title}</p>
            <p className="text-text-secondary">{banner.body}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!banner.showRestrictionBanner) return null;

  return (
    <div
      role="status"
      className={cn(
        "rounded-card border px-4 py-3 text-sm text-text-primary",
        banner.tone === "error"
          ? "border-status-error/40 bg-status-error/10"
          : "border-amber-500/40 bg-amber-500/10",
      )}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle
          className={cn(
            "mt-0.5 h-4 w-4 shrink-0",
            banner.tone === "error" ? "text-status-error" : "text-amber-600",
          )}
          aria-hidden
        />
        <div className="space-y-1">
          <p className="font-medium">{banner.title}</p>
          <p className="text-text-secondary">{banner.body}</p>
          {banner.hint ? <p className="text-text-muted">{banner.hint}</p> : null}
        </div>
      </div>
    </div>
  );
}

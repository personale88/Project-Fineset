"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useBillingAccessContext } from "@/components/billing/BillingAccessProvider";

interface BillingRestrictedValueProps {
  children: ReactNode;
  className?: string;
}

/** Blurs metric values when billing restricts data access. */
export function BillingRestrictedValue({
  children,
  className,
}: BillingRestrictedValueProps) {
  const { isRestricted, isLoading } = useBillingAccessContext();

  if (isLoading || !isRestricted) {
    return <span className={className}>{children}</span>;
  }

  return (
    <span
      className={cn("inline-block blur-[6px] select-none", className)}
      aria-label="Value hidden until payment is cleared"
    >
      {children}
    </span>
  );
}

interface BillingRestrictedMetricAreaProps {
  children: ReactNode;
  className?: string;
}

/** Blurs all metric content when billing restricts data access. */
export function BillingRestrictedMetricArea({
  children,
  className,
}: BillingRestrictedMetricAreaProps) {
  const { isRestricted, isLoading } = useBillingAccessContext();
  const shouldBlur = !isLoading && isRestricted;

  return (
    <div
      className={cn(
        shouldBlur && "pointer-events-none select-none blur-[6px]",
        className,
      )}
      aria-hidden={shouldBlur || undefined}
    >
      {children}
    </div>
  );
}

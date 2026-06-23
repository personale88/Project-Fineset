import type { BillingPaymentStatus } from "@prisma/client";
import {
  getBillingCycleStart,
  getPaymentDeadline,
  isWithinPaymentGracePeriod,
  DEFAULT_BILLING_CYCLE_SETTINGS,
  type BillingCycleSettings,
} from "@/lib/utils/billing-cycle";

export type PortalBillingAccessReason =
  | "GRACE_PERIOD"
  | "PAID"
  | "WAIVED"
  | "UNPAID_AFTER_DEADLINE"
  | "PARTIAL_AFTER_DEADLINE"
  | "DISPUTED_AFTER_DEADLINE";

export interface PortalBillingAccessInput {
  paymentStatus: BillingPaymentStatus | null;
  paidAt: Date | string | null;
  reference?: Date;
  restrictPortalOnOverdue?: boolean;
}

export interface PortalBillingAccessResult {
  canReadData: boolean;
  isGracePeriod: boolean;
  paymentDeadline: Date;
  billingCycleStart: Date;
  reason: PortalBillingAccessReason;
}

function isPaidForCurrentCycle(
  paidAt: Date | string | null,
  reference: Date,
  cycleSettings: BillingCycleSettings,
): boolean {
  if (!paidAt) return false;
  const paid = new Date(paidAt);
  if (Number.isNaN(paid.getTime())) return false;
  return paid.getTime() >= getBillingCycleStart(reference, cycleSettings).getTime();
}

export function resolvePortalBillingAccess(
  input: PortalBillingAccessInput,
  reference = new Date(),
  cycleSettings: BillingCycleSettings = DEFAULT_BILLING_CYCLE_SETTINGS,
): PortalBillingAccessResult {
  const billingCycleStart = getBillingCycleStart(reference, cycleSettings);
  const paymentDeadline = getPaymentDeadline(reference, cycleSettings);

  if (input.restrictPortalOnOverdue === false) {
    return {
      canReadData: true,
      isGracePeriod: isWithinPaymentGracePeriod(reference, cycleSettings),
      paymentDeadline,
      billingCycleStart,
      reason: "WAIVED",
    };
  }

  const isGracePeriod = isWithinPaymentGracePeriod(reference, cycleSettings);

  if (isGracePeriod) {
    return {
      canReadData: true,
      isGracePeriod: true,
      paymentDeadline,
      billingCycleStart,
      reason: "GRACE_PERIOD",
    };
  }

  const status = input.paymentStatus ?? "UNPAID";

  if (status === "WAIVED") {
    return {
      canReadData: true,
      isGracePeriod: false,
      paymentDeadline,
      billingCycleStart,
      reason: "WAIVED",
    };
  }

  if (status === "PAID" && isPaidForCurrentCycle(input.paidAt, reference, cycleSettings)) {
    return {
      canReadData: true,
      isGracePeriod: false,
      paymentDeadline,
      billingCycleStart,
      reason: "PAID",
    };
  }

  const reason: PortalBillingAccessReason =
    status === "PARTIAL"
      ? "PARTIAL_AFTER_DEADLINE"
      : status === "DISPUTED"
        ? "DISPUTED_AFTER_DEADLINE"
        : "UNPAID_AFTER_DEADLINE";

  return {
    canReadData: false,
    isGracePeriod: false,
    paymentDeadline,
    billingCycleStart,
    reason,
  };
}

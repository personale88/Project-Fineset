import type { BillingPaymentStatus } from "@prisma/client";
import type { AppSession } from "@/types";
import {
  countConsecutiveUnpaidPeriods,
  getActivationBillingPeriod,
  isBeforeBillingActivation,
  isWithinActivationDueWindow,
  STAFF_METRICS_RESTORE_UNPAID_PERIODS,
} from "@/lib/billing/activation-cycle";
import {
  isActivationPeriodPaid,
  settlementFromAccount,
  type BillingPeriodSettlement,
} from "@/lib/billing/period-settlement";

export type PortalBillingAccessReason =
  | "BEFORE_ACTIVATION"
  | "WITHIN_DUE_WINDOW"
  | "PAID"
  | "WAIVED"
  | "UNPAID_AFTER_DUE"
  | "PARTIAL_AFTER_DUE"
  | "DISPUTED_AFTER_DUE";

export type PortalBillingRestrictionTier =
  | "NONE"
  | "METRICS_BLURRED_ALL"
  | "LEADERS_RESTRICTED_STAFF_OK";

export interface PortalBillingAccessInput {
  paymentStatus: BillingPaymentStatus | null;
  paidAt: Date | string | null;
  paidThroughPeriodEnd?: Date | string | null;
  billingAnchorAt: Date | string | null;
  restrictPortalOnOverdue?: boolean;
}

export interface PortalBillingAccessResult {
  billingAnchorAt: Date | null;
  billingCycleStart: Date;
  paymentDeadline: Date;
  isGracePeriod: boolean;
  consecutiveUnpaidPeriods: number;
  restrictionTier: PortalBillingRestrictionTier;
  reason: PortalBillingAccessReason;
  /** Base read access before role-specific rules (enforcement disabled only). */
  canReadData: boolean;
}

export interface PortalBillingAccessForRole extends PortalBillingAccessResult {
  metricsBlurred: boolean;
  billingRestricted: boolean;
}

export function isBillingPaidForCurrentCycle(
  paidAt: Date | string | null,
  billingAnchorAt: Date | string | null,
  reference = new Date(),
  paidThroughPeriodEnd: Date | string | null = null,
): boolean {
  if (!billingAnchorAt) return false;
  const anchor = new Date(billingAnchorAt);
  if (Number.isNaN(anchor.getTime())) return false;
  const settlement: BillingPeriodSettlement = { paidAt, paidThroughPeriodEnd };
  return isActivationPeriodPaid(
    getActivationBillingPeriod(anchor, reference),
    settlement,
  );
}

function accessSettlement(input: PortalBillingAccessInput): BillingPeriodSettlement {
  return settlementFromAccount({
    paidAt: input.paidAt,
    paidThroughPeriodEnd: input.paidThroughPeriodEnd ?? null,
  });
}

function resolveUnpaidReason(
  status: BillingPaymentStatus,
): PortalBillingAccessReason {
  if (status === "PARTIAL") return "PARTIAL_AFTER_DUE";
  if (status === "DISPUTED") return "DISPUTED_AFTER_DUE";
  return "UNPAID_AFTER_DUE";
}

function resolveRestrictionTier(
  consecutiveUnpaidPeriods: number,
): PortalBillingRestrictionTier {
  if (consecutiveUnpaidPeriods <= 0) return "NONE";
  if (consecutiveUnpaidPeriods >= STAFF_METRICS_RESTORE_UNPAID_PERIODS) {
    return "LEADERS_RESTRICTED_STAFF_OK";
  }
  return "METRICS_BLURRED_ALL";
}

export function resolvePortalBillingAccess(
  input: PortalBillingAccessInput,
  reference = new Date(),
): PortalBillingAccessResult {
  const enforcementDisabled = input.restrictPortalOnOverdue === false;
  const status = input.paymentStatus ?? "UNPAID";

  if (!input.billingAnchorAt) {
    const fallbackStart = new Date(reference);
    fallbackStart.setHours(0, 0, 0, 0);
    const fallbackDue = new Date(fallbackStart);
    fallbackDue.setDate(fallbackDue.getDate() + 10);
    fallbackDue.setHours(23, 59, 59, 999);

    return {
      billingAnchorAt: null,
      billingCycleStart: fallbackStart,
      paymentDeadline: fallbackDue,
      isGracePeriod: true,
      consecutiveUnpaidPeriods: 0,
      restrictionTier: "NONE",
      reason: "WITHIN_DUE_WINDOW",
      canReadData: true,
    };
  }

  const billingAnchorAt = new Date(input.billingAnchorAt);
  const period = getActivationBillingPeriod(billingAnchorAt, reference);
  const settlement = accessSettlement(input);

  if (isBeforeBillingActivation(billingAnchorAt, reference)) {
    return {
      billingAnchorAt,
      billingCycleStart: period.periodStart,
      paymentDeadline: period.dueDate,
      isGracePeriod: true,
      consecutiveUnpaidPeriods: 0,
      restrictionTier: "NONE",
      reason: "BEFORE_ACTIVATION",
      canReadData: true,
    };
  }

  if (status === "WAIVED") {
    return {
      billingAnchorAt,
      billingCycleStart: period.periodStart,
      paymentDeadline: period.dueDate,
      isGracePeriod: false,
      consecutiveUnpaidPeriods: 0,
      restrictionTier: "NONE",
      reason: "WAIVED",
      canReadData: true,
    };
  }

  if (isActivationPeriodPaid(period, settlement)) {
    return {
      billingAnchorAt,
      billingCycleStart: period.periodStart,
      paymentDeadline: period.dueDate,
      isGracePeriod: false,
      consecutiveUnpaidPeriods: 0,
      restrictionTier: "NONE",
      reason: "PAID",
      canReadData: true,
    };
  }

  if (isWithinActivationDueWindow(reference, period)) {
    return {
      billingAnchorAt,
      billingCycleStart: period.periodStart,
      paymentDeadline: period.dueDate,
      isGracePeriod: true,
      consecutiveUnpaidPeriods: 0,
      restrictionTier: "NONE",
      reason: "WITHIN_DUE_WINDOW",
      canReadData: true,
    };
  }

  const consecutiveUnpaidPeriods = countConsecutiveUnpaidPeriods(
    billingAnchorAt,
    settlement,
    reference,
  );
  const restrictionTier = resolveRestrictionTier(consecutiveUnpaidPeriods);

  return {
    billingAnchorAt,
    billingCycleStart: period.periodStart,
    paymentDeadline: period.dueDate,
    isGracePeriod: false,
    consecutiveUnpaidPeriods,
    restrictionTier,
    reason: resolveUnpaidReason(status),
    canReadData: enforcementDisabled,
  };
}

export function applyPortalBillingAccessForRole(
  access: PortalBillingAccessResult,
  role: AppSession["role"],
): PortalBillingAccessForRole {
  if (role === "MASTER_ADMIN" || access.restrictionTier === "NONE") {
    return {
      ...access,
      metricsBlurred: false,
      billingRestricted: false,
      canReadData: true,
    };
  }

  if (access.canReadData) {
    return {
      ...access,
      metricsBlurred: false,
      billingRestricted: false,
      canReadData: true,
    };
  }

  if (access.restrictionTier === "LEADERS_RESTRICTED_STAFF_OK" && role === "STAFF") {
    return {
      ...access,
      metricsBlurred: false,
      billingRestricted: false,
      canReadData: true,
    };
  }

  // Blur metrics in the UI but keep pages and read APIs working.
  return {
    ...access,
    metricsBlurred: true,
    billingRestricted: false,
    canReadData: true,
  };
}

import { getActivationBillingPeriod } from "@/lib/billing/activation-cycle";
import type { BusinessOutstandingBilling } from "@/lib/billing/outstanding-billing";
import { DEFAULT_PLATFORM_SETTINGS } from "@/lib/platform/default-settings";
import { getBillingPaymentStatusLabel } from "@/lib/utils/billing-status-labels";
import { DEFAULT_BILLING_CYCLE_SETTINGS } from "@/lib/utils/billing-cycle";
import type { BusinessMonthlyBilling } from "@/lib/utils/store-billing-pricing";
import {
  buildUpiPaymentUri,
  PORTAL_PAY_NOW_TIMER_SECONDS,
  resolvePaymentUpiVpa,
} from "@/lib/utils/upi-payment";
import type {
  PortalBillingAccessSnapshot,
  PortalBillingDetailsDto,
  PortalPayNowDto,
} from "@/lib/services/portal-billing-details";

export function isDevBillingPendingMockEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.MOCK_BILLING_PENDING === "true"
  );
}

function resolveBillableMonthly(
  details: PortalBillingDetailsDto,
): BusinessMonthlyBilling | null {
  if (details.monthlyBilling.grandTotal > 0) {
    return details.monthlyBilling;
  }
  const fromOutstanding = details.outstandingBilling.periods[0]?.billing;
  if (fromOutstanding && fromOutstanding.grandTotal > 0) {
    return fromOutstanding;
  }
  return null;
}

function buildMockOutstandingBilling(
  billing: BusinessMonthlyBilling,
  reference: Date,
  billingAnchorAt: string | null,
): BusinessOutstandingBilling {
  const anchor = billingAnchorAt ? new Date(billingAnchorAt) : reference;
  const period = getActivationBillingPeriod(anchor, reference);
  const isOverdue = reference.getTime() > period.dueDate.getTime();
  const charge = {
    periodStart: period.periodStart.toISOString(),
    periodEnd: period.periodEnd.toISOString(),
    dueDate: period.dueDate.toISOString(),
    isOverdue,
    billing,
  };

  return {
    periods: [charge],
    unpaidPeriodCount: 1,
    overduePeriodCount: isOverdue ? 1 : 0,
    currentPeriod: charge,
    subtotal: billing.subtotal,
    gstTotal: billing.gstTotal,
    grandTotal: billing.grandTotal,
  };
}

function buildMockAccess(
  details: PortalBillingDetailsDto,
  outstandingBilling: BusinessOutstandingBilling,
  reference: Date,
): PortalBillingAccessSnapshot {
  const inGrace = outstandingBilling.periods[0]?.isOverdue !== true;

  return {
    ...details.access,
    canReadData: inGrace || details.access.canReadData,
    isGracePeriod: inGrace,
    billingRestricted: !inGrace,
    metricsBlurred: !inGrace,
    isPaidForCurrentCycle: false,
    consecutiveUnpaidPeriods: 1,
    restrictionTier: inGrace ? "NONE" : "LEADERS_RESTRICTED_STAFF_OK",
    reason: inGrace ? "WITHIN_DUE_WINDOW" : "UNPAID_AFTER_DUE",
    paymentDeadline:
      outstandingBilling.periods[0]?.dueDate ?? details.access.paymentDeadline,
  };
}

function buildMockPayNow(
  payNow: PortalPayNowDto,
  outstandingBilling: BusinessOutstandingBilling,
  details: PortalBillingDetailsDto,
): PortalPayNowDto {
  if (outstandingBilling.grandTotal <= 0) {
    return payNow;
  }

  const amountInr = outstandingBilling.grandTotal;
  const paymentUpiVpa = resolvePaymentUpiVpa(
    payNow.upiVpa,
    DEFAULT_PLATFORM_SETTINGS.general.paymentUpiVpa,
  );
  const invoiceRef = payNow.invoiceRef ?? details.lastInvoiceNumber ?? "INV-DEV";
  const upiPayeeName =
    payNow.upiPayeeName ?? DEFAULT_PLATFORM_SETTINGS.general.platformName;

  if (!paymentUpiVpa) {
    return {
      ...payNow,
      available: false,
      amountInr,
      unavailableReason: "NO_UPI",
      invoiceRef,
    };
  }

  return {
    available: true,
    amountInr,
    action: "upi",
    href: buildUpiPaymentUri({
      vpa: paymentUpiVpa,
      payeeName: upiPayeeName,
      amountInr,
      transactionNote: invoiceRef,
    }),
    upiVpa: paymentUpiVpa,
    upiPayeeName,
    invoiceRef,
    timerSeconds: PORTAL_PAY_NOW_TIMER_SECONDS,
    unavailableReason: null,
  };
}

export function applyDevBillingPendingMock(
  details: PortalBillingDetailsDto,
  reference = new Date(),
): PortalBillingDetailsDto {
  if (!isDevBillingPendingMockEnabled()) {
    return details;
  }

  if (
    details.paymentStatus === "PAID" ||
    details.access.isPaidForCurrentCycle ||
    details.access.reason === "PAID" ||
    details.access.reason === "WAIVED"
  ) {
    return details;
  }

  const billing = resolveBillableMonthly(details);
  if (!billing) {
    return details;
  }

  const outstandingBilling = buildMockOutstandingBilling(
    billing,
    reference,
    details.access.billingAnchorAt,
  );
  const inGrace = outstandingBilling.periods[0]?.isOverdue !== true;
  const portfolioPaymentStatus = inGrace ? "DUE_SOON" : "OVERDUE";
  const access = buildMockAccess(details, outstandingBilling, reference);

  return {
    ...details,
    paymentStatus: "UNPAID",
    portfolioPaymentStatus,
    portfolioPaymentStatusLabel: getBillingPaymentStatusLabel(
      portfolioPaymentStatus,
      DEFAULT_BILLING_CYCLE_SETTINGS,
    ),
    paidAt: null,
    renewalDueAt: outstandingBilling.periods[0]?.dueDate ?? details.renewalDueAt,
    outstandingBilling,
    monthlyBilling: billing,
    access,
    payNow: buildMockPayNow(details.payNow, outstandingBilling, details),
  };
}

export interface DevBillingAccessPatch {
  paymentStatus: "UNPAID";
  isGracePeriod: boolean;
  billingRestricted: boolean;
  metricsBlurred: boolean;
  canReadData: boolean;
  consecutiveUnpaidPeriods: number;
  restrictionTier: PortalBillingAccessSnapshot["restrictionTier"];
  reason: PortalBillingAccessSnapshot["reason"];
  outstandingGrandTotal: number;
  unpaidPeriodCount: number;
}

export function buildDevBillingAccessPatch(
  outstandingGrandTotal: number,
  inGrace: boolean,
): DevBillingAccessPatch {
  return {
    paymentStatus: "UNPAID",
    isGracePeriod: inGrace,
    billingRestricted: !inGrace,
    metricsBlurred: !inGrace,
    canReadData: inGrace,
    consecutiveUnpaidPeriods: 1,
    restrictionTier: inGrace ? "NONE" : "LEADERS_RESTRICTED_STAFF_OK",
    reason: inGrace ? "WITHIN_DUE_WINDOW" : "UNPAID_AFTER_DUE",
    outstandingGrandTotal,
    unpaidPeriodCount: outstandingGrandTotal > 0 ? 1 : 0,
  };
}

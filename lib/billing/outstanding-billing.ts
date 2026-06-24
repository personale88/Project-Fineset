import {
  getActivationBillingPeriod,
  getPreviousActivationBillingPeriod,
  type ActivationBillingPeriod,
} from "@/lib/billing/activation-cycle";
import {
  isActivationPeriodPaid,
  type BillingPeriodSettlement,
} from "@/lib/billing/period-settlement";
import { startOfCalendarDay } from "@/lib/utils/billing-cycle";
import {
  calculateBusinessMonthlyBilling,
  type BillingPricingConfig,
  type BusinessMonthlyBilling,
} from "@/lib/utils/store-billing-pricing";
import type { AdminStorePortfolioRow } from "@/types";

type BillableStore = Pick<
  AdminStorePortfolioRow,
  "storeId" | "storeName" | "staffCount" | "createdAt"
>;

export interface OutstandingPeriodCharge {
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  isOverdue: boolean;
  billing: BusinessMonthlyBilling;
}

export interface BusinessOutstandingBilling {
  periods: OutstandingPeriodCharge[];
  unpaidPeriodCount: number;
  overduePeriodCount: number;
  currentPeriod: OutstandingPeriodCharge | null;
  subtotal: number;
  gstTotal: number;
  grandTotal: number;
}

export interface CalculateOutstandingBillingOptions {
  billingAnchorAt: Date | string | null;
  settlement: BillingPeriodSettlement;
  reference?: Date;
}

/** Unpaid activation periods from first gap through the current period (oldest first). */
export function listUnpaidActivationPeriods(
  billingAnchor: Date,
  settlement: BillingPeriodSettlement,
  reference = new Date(),
): ActivationBillingPeriod[] {
  const anchorStart = startOfCalendarDay(billingAnchor);
  const ref = startOfCalendarDay(reference);
  const unpaid: ActivationBillingPeriod[] = [];

  let period = getActivationBillingPeriod(billingAnchor, ref);

  while (period.periodStart.getTime() >= anchorStart.getTime()) {
    if (!isActivationPeriodPaid(period, settlement)) {
      unpaid.unshift(period);
    } else {
      break;
    }

    if (period.periodStart.getTime() <= anchorStart.getTime()) break;
    period = getPreviousActivationBillingPeriod(billingAnchor, period.periodStart);
  }

  return unpaid;
}

function serializePeriod(
  period: ActivationBillingPeriod,
  billing: BusinessMonthlyBilling,
  reference: Date,
): OutstandingPeriodCharge {
  const ref = startOfCalendarDay(reference);
  return {
    periodStart: period.periodStart.toISOString(),
    periodEnd: period.periodEnd.toISOString(),
    dueDate: period.dueDate.toISOString(),
    isOverdue: ref.getTime() > period.dueDate.getTime(),
    billing,
  };
}

export function calculateOutstandingBilling(
  stores: BillableStore[],
  config: BillingPricingConfig,
  options: CalculateOutstandingBillingOptions,
): BusinessOutstandingBilling {
  const reference = options.reference ?? new Date();
  const anchor = options.billingAnchorAt
    ? new Date(options.billingAnchorAt)
    : null;

  if (!anchor || Number.isNaN(anchor.getTime()) || stores.length === 0) {
    const empty = calculateBusinessMonthlyBilling(stores, config, { reference });
    return {
      periods: [],
      unpaidPeriodCount: 0,
      overduePeriodCount: 0,
      currentPeriod: null,
      subtotal: 0,
      gstTotal: 0,
      grandTotal: 0,
    };
  }

  const unpaidPeriods = listUnpaidActivationPeriods(
    anchor,
    options.settlement,
    reference,
  );

  const periods = unpaidPeriods.map((period) => {
    const billing = calculateBusinessMonthlyBilling(stores, config, {
      billingAnchorAt: anchor,
      reference: period.periodStart,
    });
    return serializePeriod(period, billing, reference);
  });

  const subtotal = periods.reduce((sum, period) => sum + period.billing.subtotal, 0);
  const gstTotal = periods.reduce((sum, period) => sum + period.billing.gstTotal, 0);
  const overduePeriodCount = periods.filter((period) => period.isOverdue).length;

  return {
    periods,
    unpaidPeriodCount: periods.length,
    overduePeriodCount,
    currentPeriod: periods.at(-1) ?? null,
    subtotal,
    gstTotal,
    grandTotal: subtotal + gstTotal,
  };
}

/** Consolidated line items for invoice email (all unpaid periods). */
export function consolidateOutstandingBilling(
  outstanding: BusinessOutstandingBilling,
): BusinessMonthlyBilling {
  return {
    stores: outstanding.periods.flatMap((period) => period.billing.stores),
    subtotal: outstanding.subtotal,
    gstTotal: outstanding.gstTotal,
    grandTotal: outstanding.grandTotal,
  };
}

export type OutstandingPeriodBreakdownJson = Array<{
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  isOverdue: boolean;
  subtotal: number;
  gstTotal: number;
  grandTotal: number;
}>;

export function outstandingPeriodBreakdownJson(
  outstanding: BusinessOutstandingBilling,
): OutstandingPeriodBreakdownJson {
  return outstanding.periods.map((period) => ({
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
    dueDate: period.dueDate,
    isOverdue: period.isOverdue,
    subtotal: period.billing.subtotal,
    gstTotal: period.billing.gstTotal,
    grandTotal: period.billing.grandTotal,
  }));
}

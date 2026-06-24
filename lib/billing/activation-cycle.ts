import { startOfCalendarDay } from "@/lib/utils/billing-cycle";
import {
  isActivationPeriodPaid,
  type BillingPeriodSettlement,
} from "@/lib/billing/period-settlement";

/** Days after billing period start when payment is due (inclusive end of due day). */
export const PAYMENT_DUE_DAYS_AFTER_CYCLE_START = 10;

/** Unpaid periods after which staff regain metric access while leaders stay restricted. */
export const STAFF_METRICS_RESTORE_UNPAID_PERIODS = 2;

export interface ActivationBillingPeriod {
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date;
}

function anchorDayInMonth(year: number, month: number, anchorDay: number): number {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return Math.min(anchorDay, lastDay);
}

function periodStartForMonth(
  year: number,
  month: number,
  anchorDay: number,
): Date {
  return startOfCalendarDay(
    new Date(year, month, anchorDayInMonth(year, month, anchorDay)),
  );
}

/** Monthly billing period anchored to the activation day-of-month. */
export function getActivationBillingPeriod(
  billingAnchor: Date,
  reference = new Date(),
): ActivationBillingPeriod {
  const anchor = startOfCalendarDay(billingAnchor);
  const anchorDay = anchor.getDate();
  const ref = startOfCalendarDay(reference);

  let year = ref.getFullYear();
  let month = ref.getMonth();
  let periodStart = periodStartForMonth(year, month, anchorDay);

  if (ref.getTime() < periodStart.getTime()) {
    month -= 1;
    if (month < 0) {
      month = 11;
      year -= 1;
    }
    periodStart = periodStartForMonth(year, month, anchorDay);
  }

  let nextMonth = periodStart.getMonth() + 1;
  let nextYear = periodStart.getFullYear();
  if (nextMonth > 11) {
    nextMonth = 0;
    nextYear += 1;
  }
  const nextPeriodStart = periodStartForMonth(nextYear, nextMonth, anchorDay);
  const periodEnd = startOfCalendarDay(nextPeriodStart);
  periodEnd.setDate(periodEnd.getDate() - 1);
  periodEnd.setHours(23, 59, 59, 999);

  const dueDate = startOfCalendarDay(periodStart);
  dueDate.setDate(dueDate.getDate() + PAYMENT_DUE_DAYS_AFTER_CYCLE_START);
  dueDate.setHours(23, 59, 59, 999);

  return { periodStart, periodEnd, dueDate };
}

export function getPreviousActivationBillingPeriod(
  billingAnchor: Date,
  periodStart: Date,
): ActivationBillingPeriod {
  const anchorDay = startOfCalendarDay(billingAnchor).getDate();
  let year = periodStart.getFullYear();
  let month = periodStart.getMonth() - 1;
  if (month < 0) {
    month = 11;
    year -= 1;
  }
  const previousStart = periodStartForMonth(year, month, anchorDay);
  return getActivationBillingPeriod(billingAnchor, previousStart);
}

export function isPaidForActivationPeriod(
  paidAt: Date | string | null,
  period: ActivationBillingPeriod,
  paidThroughPeriodEnd: Date | string | null = null,
): boolean {
  return isActivationPeriodPaid(period, { paidAt, paidThroughPeriodEnd });
}

export function isBillingSettlementPaidForPeriod(
  period: ActivationBillingPeriod,
  settlement: BillingPeriodSettlement,
): boolean {
  return isActivationPeriodPaid(period, settlement);
}

export function isWithinActivationDueWindow(
  reference: Date,
  period: ActivationBillingPeriod,
): boolean {
  return startOfCalendarDay(reference).getTime() <= period.dueDate.getTime();
}

export function isBeforeBillingActivation(
  billingAnchor: Date,
  reference: Date,
): boolean {
  return startOfCalendarDay(reference).getTime() < startOfCalendarDay(billingAnchor).getTime();
}

/** Count consecutive overdue billing periods without payment (0 = current or paid). */
export function countConsecutiveUnpaidPeriods(
  billingAnchor: Date,
  settlement: BillingPeriodSettlement,
  reference = new Date(),
): number {
  const ref = startOfCalendarDay(reference);
  let period = getActivationBillingPeriod(billingAnchor, ref);

  if (isActivationPeriodPaid(period, settlement)) return 0;
  if (ref.getTime() <= period.dueDate.getTime()) return 0;

  let count = 0;
  const anchorStart = startOfCalendarDay(billingAnchor);

  while (period.periodStart.getTime() >= anchorStart.getTime()) {
    if (ref.getTime() <= period.dueDate.getTime()) break;
    if (isActivationPeriodPaid(period, settlement)) break;
    count += 1;
    if (period.periodStart.getTime() <= anchorStart.getTime()) break;
    period = getPreviousActivationBillingPeriod(billingAnchor, period.periodStart);
  }

  return count;
}
/** Earliest store activation date for a business portfolio. */
export function resolveBusinessBillingAnchor(
  stores: ReadonlyArray<{ createdAt: Date | string }>,
): Date | null {
  if (stores.length === 0) return null;
  const timestamps = stores
    .map((store) => new Date(store.createdAt).getTime())
    .filter((value) => !Number.isNaN(value));
  if (timestamps.length === 0) return null;
  return startOfCalendarDay(new Date(Math.min(...timestamps)));
}

/** Pro-rate factor for a store added mid-cycle (0–1). */
export function activationProRateFactor(
  storeActivatedAt: Date | string,
  period: ActivationBillingPeriod,
): number {
  const activated = startOfCalendarDay(new Date(storeActivatedAt));
  const periodStart = period.periodStart.getTime();
  const periodEnd = period.periodEnd.getTime();

  if (Number.isNaN(activated.getTime()) || activated.getTime() > periodEnd) return 0;
  if (activated.getTime() <= periodStart) return 1;

  const msPerDay = 86_400_000;
  const totalDays = Math.max(1, Math.round((periodEnd - periodStart) / msPerDay) + 1);
  const billDays = Math.max(1, Math.round((periodEnd - activated.getTime()) / msPerDay) + 1);
  return Math.min(1, billDays / totalDays);
}

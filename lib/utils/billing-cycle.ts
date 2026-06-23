/** Monthly billing cycle runs from the 1st through the last day of the month. */
export const BILLING_PAYMENT_DUE_DAY = 10;

export type BillingCycleSettings = {
  cycleStartDay: number;
  paymentDueDay: number;
  gracePeriodDays: number;
};

export const DEFAULT_BILLING_CYCLE_SETTINGS: BillingCycleSettings = {
  cycleStartDay: 1,
  paymentDueDay: BILLING_PAYMENT_DUE_DAY,
  gracePeriodDays: BILLING_PAYMENT_DUE_DAY,
};

export function startOfCalendarDay(reference: Date): Date {
  const day = new Date(reference);
  day.setHours(0, 0, 0, 0);
  return day;
}

/** First day of the billing month containing `reference`. */
export function getBillingCycleStart(
  reference = new Date(),
  settings: BillingCycleSettings = DEFAULT_BILLING_CYCLE_SETTINGS,
): Date {
  const day = startOfCalendarDay(reference);
  const cycleStartDay = settings.cycleStartDay;
  if (day.getDate() >= cycleStartDay) {
    return new Date(day.getFullYear(), day.getMonth(), cycleStartDay);
  }
  return new Date(day.getFullYear(), day.getMonth() - 1, cycleStartDay);
}

/** First day of the next billing month. */
export function getNextBillingCycleStart(
  reference = new Date(),
  settings: BillingCycleSettings = DEFAULT_BILLING_CYCLE_SETTINGS,
): Date {
  const cycleStart = getBillingCycleStart(reference, settings);
  return new Date(cycleStart.getFullYear(), cycleStart.getMonth() + 1, cycleStart.getDate());
}

/** Payment deadline for the billing month containing `reference` (inclusive through end of day). */
export function getPaymentDeadline(
  reference = new Date(),
  settings: BillingCycleSettings = DEFAULT_BILLING_CYCLE_SETTINGS,
): Date {
  const day = startOfCalendarDay(reference);
  const deadline = new Date(
    day.getFullYear(),
    day.getMonth(),
    settings.paymentDueDay,
  );
  deadline.setHours(23, 59, 59, 999);
  return deadline;
}

/** True during the configured grace period of the billing month. */
export function isWithinPaymentGracePeriod(
  reference = new Date(),
  settings: BillingCycleSettings = DEFAULT_BILLING_CYCLE_SETTINGS,
): boolean {
  const day = startOfCalendarDay(reference);
  return day.getDate() <= settings.gracePeriodDays;
}

export function getBillingDatesForPaidCycle(
  reference = new Date(),
  settings: BillingCycleSettings = DEFAULT_BILLING_CYCLE_SETTINGS,
): {
  renewalDueAt: Date;
  dataExpiryAt: Date;
} {
  const nextCycleStart = getNextBillingCycleStart(reference, settings);
  const renewalDueAt = new Date(
    nextCycleStart.getFullYear(),
    nextCycleStart.getMonth(),
    settings.paymentDueDay,
  );
  const dataExpiryAt = new Date(
    nextCycleStart.getFullYear(),
    nextCycleStart.getMonth() + 1,
    settings.cycleStartDay,
  );
  return { renewalDueAt, dataExpiryAt };
}

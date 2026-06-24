import type { ActivationBillingPeriod } from "@/lib/billing/activation-cycle";
import { PAYMENT_DUE_DAYS_AFTER_CYCLE_START } from "@/lib/billing/activation-cycle";
import { startOfCalendarDay } from "@/lib/utils/billing-cycle";

export interface BillingPeriodSettlement {
  paidAt: Date | string | null;
  paidThroughPeriodEnd: Date | string | null;
}

const MS_PER_DAY = 86_400_000;

/** Whether a consolidated or legacy payment covers this activation period. */
export function isActivationPeriodPaid(
  period: ActivationBillingPeriod,
  settlement: BillingPeriodSettlement,
): boolean {
  const throughRaw = settlement.paidThroughPeriodEnd;
  if (throughRaw) {
    const through = startOfCalendarDay(new Date(throughRaw));
    through.setHours(23, 59, 59, 999);
    if (!Number.isNaN(through.getTime())) {
      return period.periodEnd.getTime() <= through.getTime();
    }
  }

  if (!settlement.paidAt) return false;
  const paid = new Date(settlement.paidAt);
  if (Number.isNaN(paid.getTime())) return false;

  const dueGraceEnd = startOfCalendarDay(period.periodStart);
  dueGraceEnd.setDate(dueGraceEnd.getDate() + PAYMENT_DUE_DAYS_AFTER_CYCLE_START);
  dueGraceEnd.setHours(23, 59, 59, 999);

  return (
    paid.getTime() >= period.periodStart.getTime() &&
    paid.getTime() <= dueGraceEnd.getTime()
  );
}

export function settlementFromAccount(account: {
  paidAt: Date | string | null;
  paidThroughPeriodEnd?: Date | string | null;
}): BillingPeriodSettlement {
  return {
    paidAt: account.paidAt,
    paidThroughPeriodEnd: account.paidThroughPeriodEnd ?? null,
  };
}

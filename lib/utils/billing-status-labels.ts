import type { BillingCycleSettings } from "@/lib/utils/billing-cycle";

export function formatOrdinalDay(day: number): string {
  const mod100 = day % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${day}th`;
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

export function formatBillingDeadlineFallback(
  settings: BillingCycleSettings,
): string {
  return `the ${formatOrdinalDay(settings.paymentDueDay)} of this month`;
}

export interface BillingPaymentStatusCopy {
  labels: {
    current: string;
    dueSoon: string;
    overdue: string;
    expired: string;
    unknown: string;
  };
  hints: {
    current: string;
    dueSoon: string;
    overdue: string;
    expired: string;
    unknown: string;
  };
}

export function getBillingPaymentStatusCopy(
  settings: BillingCycleSettings,
): BillingPaymentStatusCopy {
  const dueDayLabel = formatOrdinalDay(settings.paymentDueDay);
  const graceEnd = settings.gracePeriodDays;

  const graceHint =
    graceEnd <= 1
      ? "Grace period on day 1"
      : `Grace period through day ${graceEnd}`;

  return {
    labels: {
      current: "Current",
      dueSoon: "Due soon",
      overdue: "Overdue",
      expired: "Expired",
      unknown: "Not set",
    },
    hints: {
      overdue: "Renewal date has passed",
      dueSoon: `${graceHint} or payment due by the ${dueDayLabel} of the month`,
      expired: "Data access period ended",
      current: `Paid for this cycle or renewal after the ${dueDayLabel}`,
      unknown: "Missing renewal or expiry dates",
    },
  };
}

export type AdminPortfolioPaymentStatusKey =
  | "CURRENT"
  | "DUE_SOON"
  | "OVERDUE"
  | "EXPIRED"
  | "UNKNOWN";

const STATUS_LABEL_KEYS: Record<
  AdminPortfolioPaymentStatusKey,
  keyof BillingPaymentStatusCopy["labels"]
> = {
  CURRENT: "current",
  DUE_SOON: "dueSoon",
  OVERDUE: "overdue",
  EXPIRED: "expired",
  UNKNOWN: "unknown",
};

export function getBillingPaymentStatusLabel(
  status: AdminPortfolioPaymentStatusKey,
  settings: BillingCycleSettings,
): string {
  const copy = getBillingPaymentStatusCopy(settings);
  return copy.labels[STATUS_LABEL_KEYS[status]];
}

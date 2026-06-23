import type { BillingPaymentStatus } from "@prisma/client";
import type { BusinessPortfolioRow } from "@/types";
import type { BillingCycleSettings } from "@/lib/utils/billing-cycle";
import {
  getPaymentDeadline,
  isWithinPaymentGracePeriod,
  DEFAULT_BILLING_CYCLE_SETTINGS,
} from "@/lib/utils/billing-cycle";
import { resolvePortalBillingAccess } from "@/lib/utils/portal-billing-access";

export type AdminPortfolioPaymentStatus =
  | "CURRENT"
  | "DUE_SOON"
  | "OVERDUE"
  | "EXPIRED"
  | "UNKNOWN";

function startOfToday(reference = new Date()): Date {
  const day = new Date(reference);
  day.setHours(0, 0, 0, 0);
  return day;
}

export function getBusinessPaymentStatus(
  business: Pick<BusinessPortfolioRow, "renewalDueAt" | "dataExpiryAt">,
  reference = new Date(),
  billingPaymentStatus?: BillingPaymentStatus | null,
  paidAt?: Date | string | null,
  cycleSettings: BillingCycleSettings = DEFAULT_BILLING_CYCLE_SETTINGS,
): AdminPortfolioPaymentStatus {
  const today = startOfToday(reference);

  if (business.dataExpiryAt) {
    const expiry = startOfToday(new Date(business.dataExpiryAt));
    if (expiry.getTime() <= today.getTime()) return "EXPIRED";
  }

  const portalAccess = resolvePortalBillingAccess(
    {
      paymentStatus: billingPaymentStatus ?? null,
      paidAt: paidAt ?? null,
    },
    reference,
    cycleSettings,
  );

  if (portalAccess.canReadData && portalAccess.reason === "PAID") {
    return "CURRENT";
  }

  if (portalAccess.canReadData && portalAccess.reason === "WAIVED") {
    return "CURRENT";
  }

  if (isWithinPaymentGracePeriod(reference, cycleSettings)) {
    return "DUE_SOON";
  }

  if (!portalAccess.canReadData) {
    return "OVERDUE";
  }

  if (business.renewalDueAt) {
    const due = startOfToday(new Date(business.renewalDueAt));
    if (due.getTime() < today.getTime()) return "OVERDUE";

    const deadline = startOfToday(getPaymentDeadline(reference, cycleSettings));
    if (due.getTime() <= deadline.getTime()) return "DUE_SOON";

    return "CURRENT";
  }

  return "UNKNOWN";
}

export function derivePortfolioAreaOptions(
  businesses: BusinessPortfolioRow[],
): string[] {
  const areas = new Set<string>();

  for (const business of businesses) {
    for (const store of business.stores) {
      const state = store.state?.trim();
      const city = store.city?.trim();
      if (state && city) areas.add(`${city}, ${state}`);
      else if (state) areas.add(state);
      else if (city) areas.add(city);
    }
  }

  return [...areas].sort((a, b) => a.localeCompare(b));
}

export function businessMatchesAreaFilter(
  business: BusinessPortfolioRow,
  areaFilter: string,
): boolean {
  if (areaFilter === "ALL") return true;

  return business.stores.some((store) => {
    const state = store.state?.trim();
    const city = store.city?.trim();
    const cityState = state && city ? `${city}, ${state}` : state ?? city ?? "";
    return cityState === areaFilter;
  });
}

export function businessMatchesPaymentFilter(
  business: BusinessPortfolioRow,
  paymentFilter: "ALL" | AdminPortfolioPaymentStatus,
  cycleSettings: BillingCycleSettings = DEFAULT_BILLING_CYCLE_SETTINGS,
): boolean {
  if (paymentFilter === "ALL") return true;
  return getBusinessPaymentStatus(business, new Date(), undefined, undefined, cycleSettings) === paymentFilter;
}

export function countBusinessesByPaymentStatus(
  businesses: BusinessPortfolioRow[],
  reference = new Date(),
  cycleSettings: BillingCycleSettings = DEFAULT_BILLING_CYCLE_SETTINGS,
): Record<AdminPortfolioPaymentStatus, number> {
  const counts: Record<AdminPortfolioPaymentStatus, number> = {
    CURRENT: 0,
    DUE_SOON: 0,
    OVERDUE: 0,
    EXPIRED: 0,
    UNKNOWN: 0,
  };

  for (const business of businesses) {
    counts[getBusinessPaymentStatus(business, reference, undefined, undefined, cycleSettings)] += 1;
  }

  return counts;
}

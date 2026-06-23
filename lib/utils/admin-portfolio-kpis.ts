import type { BillingAccountSummaryDto } from "@/lib/api/billing";
import type { BillingCycleSettings } from "@/lib/utils/billing-cycle";
import { DEFAULT_BILLING_CYCLE_SETTINGS } from "@/lib/utils/billing-cycle";
import {
  countBusinessesByPaymentStatus,
  getBusinessPaymentStatus,
  type AdminPortfolioPaymentStatus,
} from "@/lib/utils/admin-portfolio-filters";
import { calculateBusinessMonthlyBilling } from "@/lib/utils/store-billing-pricing";
import type { BusinessPortfolioRow } from "@/types";

const STALE_LOGIN_DAYS = 30;
const AT_RISK_STATUSES: AdminPortfolioPaymentStatus[] = [
  "OVERDUE",
  "DUE_SOON",
  "EXPIRED",
];

export interface AdminPortfolioKpis {
  totalBusinesses: number;
  totalStores: number;
  activeStores: number;
  inactiveStores: number;
  activeStoreRate: number;
  totalStaff: number;
  mrr: number;
  atRiskMrr: number;
  avgRevenuePerBusiness: number;
  paymentStatusCounts: Record<AdminPortfolioPaymentStatus, number>;
  missingContactCount: number;
  missingEmailCount: number;
  missingPhoneCount: number;
  staleOwnerLoginCount: number;
  followUpsDueCount: number;
  unpaidBillingCount: number;
}

function isStaleOwnerLogin(
  lastLoginAt: string | null,
  reference = new Date(),
): boolean {
  if (!lastLoginAt) return true;
  const lastLogin = new Date(lastLoginAt);
  if (Number.isNaN(lastLogin.getTime())) return true;
  const cutoff = new Date(reference);
  cutoff.setDate(cutoff.getDate() - STALE_LOGIN_DAYS);
  return lastLogin.getTime() < cutoff.getTime();
}

function isFollowUpDue(nextFollowUpAt: string | null, reference = new Date()): boolean {
  if (!nextFollowUpAt) return false;
  const due = new Date(nextFollowUpAt);
  if (Number.isNaN(due.getTime())) return false;
  return due.getTime() <= reference.getTime();
}

export function computeAdminPortfolioKpis(
  businesses: BusinessPortfolioRow[],
  billingSummaries: BillingAccountSummaryDto[] = [],
  reference = new Date(),
  cycleSettings: BillingCycleSettings = DEFAULT_BILLING_CYCLE_SETTINGS,
): AdminPortfolioKpis {
  const paymentStatusCounts = countBusinessesByPaymentStatus(
    businesses,
    reference,
    cycleSettings,
  );

  let totalStores = 0;
  let activeStores = 0;
  let inactiveStores = 0;
  let totalStaff = 0;
  let mrr = 0;
  let atRiskMrr = 0;
  let missingContactCount = 0;
  let missingEmailCount = 0;
  let missingPhoneCount = 0;
  let staleOwnerLoginCount = 0;

  for (const business of businesses) {
    totalStores += business.storeCount;
    activeStores += business.activeStoreCount;
    inactiveStores += business.inactiveStoreCount;
    totalStaff += business.stores.reduce((sum, store) => sum + store.staffCount, 0);

    const billing = calculateBusinessMonthlyBilling(business.stores);
    mrr += billing.grandTotal;

    const portfolioStatus = getBusinessPaymentStatus(
      business,
      reference,
      undefined,
      undefined,
      cycleSettings,
    );
    if (AT_RISK_STATUSES.includes(portfolioStatus)) {
      atRiskMrr += billing.grandTotal;
    }

    const hasEmail = Boolean(business.businessEmail?.trim());
    const hasPhone = Boolean(business.businessPhone?.trim());
    if (!hasEmail) missingEmailCount += 1;
    if (!hasPhone) missingPhoneCount += 1;
    if (!hasEmail || !hasPhone) missingContactCount += 1;

    if (hasEmail && isStaleOwnerLogin(business.ownerLastLoginAt, reference)) {
      staleOwnerLoginCount += 1;
    }
  }

  const summaryByKey = new Map(
    billingSummaries.map((summary) => [summary.businessKey, summary]),
  );

  let followUpsDueCount = 0;
  let unpaidBillingCount = 0;

  for (const business of businesses) {
    const summary = summaryByKey.get(business.businessKey);
    if (summary?.paymentStatus === "UNPAID" || summary?.paymentStatus === "PARTIAL") {
      unpaidBillingCount += 1;
    } else if (
      !summary &&
      getBusinessPaymentStatus(business, reference, undefined, undefined, cycleSettings) !==
        "CURRENT"
    ) {
      unpaidBillingCount += 1;
    }

    if (summary && isFollowUpDue(summary.nextFollowUpAt, reference)) {
      followUpsDueCount += 1;
    }
  }

  const totalBusinesses = businesses.length;
  const activeStoreRate =
    totalStores > 0 ? Math.round((activeStores / totalStores) * 100) : 0;
  const avgRevenuePerBusiness =
    totalBusinesses > 0 ? Math.round(mrr / totalBusinesses) : 0;

  return {
    totalBusinesses,
    totalStores,
    activeStores,
    inactiveStores,
    activeStoreRate,
    totalStaff,
    mrr,
    atRiskMrr,
    avgRevenuePerBusiness,
    paymentStatusCounts,
    missingContactCount,
    missingEmailCount,
    missingPhoneCount,
    staleOwnerLoginCount,
    followUpsDueCount,
    unpaidBillingCount,
  };
}

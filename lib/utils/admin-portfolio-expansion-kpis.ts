import { calculateStoreMonthlyCharge } from "@/lib/utils/store-billing-pricing";
import type { BusinessPortfolioRow } from "@/types";

const ACTIVATION_WINDOW_DAYS = 14;

export function isNearTierUpgradeStaffCount(staffCount: number): boolean {
  const count = Math.max(0, Math.floor(staffCount));
  return (count >= 8 && count <= 10) || (count >= 18 && count <= 20);
}

export function calculateStoreExpansionMrrUpside(staffCount: number): number {
  const count = Math.max(0, Math.floor(staffCount));
  const current = calculateStoreMonthlyCharge({
    storeId: "x",
    storeName: "x",
    staffCount: count,
  }).totalAmount;

  if (count >= 8 && count <= 10) {
    const next = calculateStoreMonthlyCharge({
      storeId: "x",
      storeName: "x",
      staffCount: 11,
    }).totalAmount;
    return Math.max(0, next - current);
  }

  if (count >= 18 && count <= 20) {
    const next = calculateStoreMonthlyCharge({
      storeId: "x",
      storeName: "x",
      staffCount: 21,
    }).totalAmount;
    return Math.max(0, next - current);
  }

  return 0;
}

export interface AdminPortfolioExpansionKpis {
  nearTierUpgradeStores: number;
  nearTierUpgradeBusinesses: number;
  singleStoreBusinesses: number;
  expansionMrrUpside: number;
}

export function computeAdminPortfolioExpansionKpis(
  businesses: BusinessPortfolioRow[],
): AdminPortfolioExpansionKpis {
  let nearTierUpgradeStores = 0;
  let expansionMrrUpside = 0;
  let nearTierUpgradeBusinesses = 0;
  let singleStoreBusinesses = 0;

  for (const business of businesses) {
    if (business.storeCount === 1) singleStoreBusinesses += 1;

    let businessNearTier = false;
    for (const store of business.stores) {
      if (isNearTierUpgradeStaffCount(store.staffCount)) {
        nearTierUpgradeStores += 1;
        businessNearTier = true;
        expansionMrrUpside += calculateStoreExpansionMrrUpside(store.staffCount);
      }
    }
    if (businessNearTier) nearTierUpgradeBusinesses += 1;
  }

  return {
    nearTierUpgradeStores,
    nearTierUpgradeBusinesses,
    singleStoreBusinesses,
    expansionMrrUpside,
  };
}

export { ACTIVATION_WINDOW_DAYS };

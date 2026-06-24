import type { AdminStorePortfolioRow } from "@/types";
import type { PlatformSettingsBilling } from "@/lib/platform/types";
import { DEFAULT_PLATFORM_SETTINGS } from "@/lib/platform/default-settings";
import {
  activationProRateFactor,
  getActivationBillingPeriod,
} from "@/lib/billing/activation-cycle";

export const GST_RATE = DEFAULT_PLATFORM_SETTINGS.billing.gstRatePercent / 100;

export type StoreBillingTier = "TIER_1" | "TIER_2" | "TIER_3";

export interface BillingPricingConfig {
  gstRate: number;
  tier1MaxStaff: number;
  tier2MaxStaff: number;
  tier1MonthlyPrice: number;
  tier2MonthlyPrice: number;
  tier3MonthlyPrice: number;
}

export function billingPricingFromSettings(
  billing: PlatformSettingsBilling = DEFAULT_PLATFORM_SETTINGS.billing,
): BillingPricingConfig {
  return {
    gstRate: billing.gstRatePercent / 100,
    tier1MaxStaff: billing.tier1MaxStaff,
    tier2MaxStaff: billing.tier2MaxStaff,
    tier1MonthlyPrice: billing.tier1MonthlyPrice,
    tier2MonthlyPrice: billing.tier2MonthlyPrice,
    tier3MonthlyPrice: billing.tier3MonthlyPrice,
  };
}

export const DEFAULT_BILLING_PRICING_CONFIG = billingPricingFromSettings();

const TIER_BASE_MONTHLY: Record<StoreBillingTier, keyof BillingPricingConfig> = {
  TIER_1: "tier1MonthlyPrice",
  TIER_2: "tier2MonthlyPrice",
  TIER_3: "tier3MonthlyPrice",
};

export interface StoreMonthlyCharge {
  storeId: string;
  storeName: string;
  staffCount: number;
  tier: StoreBillingTier;
  tierLabel: string;
  baseAmount: number;
  gstAmount: number;
  totalAmount: number;
  proRateFactor?: number;
}

export interface BusinessMonthlyBillingOptions {
  billingAnchorAt?: Date | string | null;
  reference?: Date;
}

type BillableStore = Pick<
  AdminStorePortfolioRow,
  "storeId" | "storeName" | "staffCount"
> & {
  createdAt?: string;
};

export interface BusinessMonthlyBilling {
  stores: StoreMonthlyCharge[];
  subtotal: number;
  gstTotal: number;
  grandTotal: number;
}

export function resolveStoreBillingTier(
  staffCount: number,
  config: BillingPricingConfig = DEFAULT_BILLING_PRICING_CONFIG,
): StoreBillingTier {
  const count = Math.max(0, Math.floor(staffCount));
  if (count <= config.tier1MaxStaff) return "TIER_1";
  if (count <= config.tier2MaxStaff) return "TIER_2";
  return "TIER_3";
}

export function formatBillingTierLabel(
  tier: StoreBillingTier,
  config: BillingPricingConfig = DEFAULT_BILLING_PRICING_CONFIG,
): string {
  switch (tier) {
    case "TIER_1":
      return `1–${config.tier1MaxStaff} employees`;
    case "TIER_2":
      return `${config.tier1MaxStaff + 1}–${config.tier2MaxStaff} employees`;
    case "TIER_3":
      return `${config.tier2MaxStaff + 1}+ employees`;
  }
}

export function getTierBaseMonthlyAmount(
  tier: StoreBillingTier,
  config: BillingPricingConfig = DEFAULT_BILLING_PRICING_CONFIG,
): number {
  return config[TIER_BASE_MONTHLY[tier]];
}

export function calculateStoreMonthlyCharge(
  store: Pick<AdminStorePortfolioRow, "storeId" | "storeName" | "staffCount">,
  config: BillingPricingConfig = DEFAULT_BILLING_PRICING_CONFIG,
  proRateFactor = 1,
): StoreMonthlyCharge {
  const tier = resolveStoreBillingTier(store.staffCount, config);
  const fullBase = getTierBaseMonthlyAmount(tier, config);
  const baseAmount = Math.round(fullBase * proRateFactor);
  const gstAmount = Math.round(baseAmount * config.gstRate);
  const totalAmount = baseAmount + gstAmount;

  return {
    storeId: store.storeId,
    storeName: store.storeName,
    staffCount: store.staffCount,
    tier,
    tierLabel: formatBillingTierLabel(tier, config),
    baseAmount,
    gstAmount,
    totalAmount,
    proRateFactor: proRateFactor < 1 ? proRateFactor : undefined,
  };
}

export function calculateBusinessMonthlyBilling(
  stores: BillableStore[],
  config: BillingPricingConfig = DEFAULT_BILLING_PRICING_CONFIG,
  options?: BusinessMonthlyBillingOptions,
): BusinessMonthlyBilling {
  const reference = options?.reference ?? new Date();
  const anchor = options?.billingAnchorAt ? new Date(options.billingAnchorAt) : null;
  const period =
    anchor && !Number.isNaN(anchor.getTime())
      ? getActivationBillingPeriod(anchor, reference)
      : null;

  const lineItems = stores
    .map((store) => {
      const proRateFactor =
        period && store.createdAt
          ? activationProRateFactor(store.createdAt, period)
          : 1;
      if (proRateFactor <= 0) return null;
      return calculateStoreMonthlyCharge(store, config, proRateFactor);
    })
    .filter((item): item is StoreMonthlyCharge => item != null);

  const subtotal = lineItems.reduce((sum, item) => sum + item.baseAmount, 0);
  const gstTotal = lineItems.reduce((sum, item) => sum + item.gstAmount, 0);

  return {
    stores: lineItems,
    subtotal,
    gstTotal,
    grandTotal: subtotal + gstTotal,
  };
}

export function formatPricingTiersSummary(
  config: BillingPricingConfig = DEFAULT_BILLING_PRICING_CONFIG,
  gstRatePercent = Math.round(config.gstRate * 100),
): string {
  const fmt = (amount: number) =>
    amount.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

  return `${fmt(config.tier1MonthlyPrice)} (1–${config.tier1MaxStaff} staff) · ${fmt(config.tier2MonthlyPrice)} (${config.tier1MaxStaff + 1}–${config.tier2MaxStaff}) · ${fmt(config.tier3MonthlyPrice)} (${config.tier2MaxStaff + 1}+) per store/mo excl. GST + ${gstRatePercent}% GST`;
}

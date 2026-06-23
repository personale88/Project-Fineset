"use client";

import { createContext, useContext } from "react";
import type { PlatformSettings } from "@/lib/platform/types";
import {
  billingPricingFromSettings,
  type BillingPricingConfig,
} from "@/lib/utils/store-billing-pricing";

interface PlatformSettingsContextValue {
  settings: PlatformSettings;
  billingPricing: BillingPricingConfig;
}

const PlatformSettingsContext = createContext<PlatformSettingsContextValue | null>(null);

export function PlatformSettingsProvider({
  settings,
  children,
}: {
  settings: PlatformSettings;
  children: React.ReactNode;
}) {
  const billingPricing = billingPricingFromSettings(settings.billing);

  return (
    <PlatformSettingsContext.Provider value={{ settings, billingPricing }}>
      {children}
    </PlatformSettingsContext.Provider>
  );
}

export function usePlatformSettingsContext(): PlatformSettingsContextValue {
  const value = useContext(PlatformSettingsContext);
  if (!value) {
    throw new Error("usePlatformSettingsContext must be used within PlatformSettingsProvider");
  }
  return value;
}

export function usePlatformSettingsOptional(): PlatformSettingsContextValue | null {
  return useContext(PlatformSettingsContext);
}

export function useBillingPricingConfig(): BillingPricingConfig {
  const context = usePlatformSettingsOptional();
  return context?.billingPricing ?? billingPricingFromSettings();
}

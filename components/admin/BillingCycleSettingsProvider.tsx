"use client";

import { createContext, useContext } from "react";
import {
  DEFAULT_BILLING_CYCLE_SETTINGS,
  type BillingCycleSettings,
} from "@/lib/utils/billing-cycle";

const BillingCycleSettingsContext = createContext<BillingCycleSettings>(
  DEFAULT_BILLING_CYCLE_SETTINGS,
);

export function BillingCycleSettingsProvider({
  settings,
  children,
}: {
  settings: BillingCycleSettings;
  children: React.ReactNode;
}) {
  return (
    <BillingCycleSettingsContext.Provider value={settings}>
      {children}
    </BillingCycleSettingsContext.Provider>
  );
}

export function useBillingCycleSettings(): BillingCycleSettings {
  return useContext(BillingCycleSettingsContext);
}

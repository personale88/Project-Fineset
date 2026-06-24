"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useBillingAccess } from "@/hooks/useBillingAccess";
import type { PortalBillingAccessState } from "@/lib/api/portal-billing-access";

interface BillingAccessContextValue {
  access: PortalBillingAccessState | undefined;
  isLoading: boolean;
  isError: boolean;
  /** API data reads blocked for this role */
  isRestricted: boolean;
  /** Metric values/charts blurred in UI */
  metricsBlurred: boolean;
  refetch: () => void;
}

const BillingAccessContext = createContext<BillingAccessContextValue>({
  access: undefined,
  isLoading: true,
  isError: false,
  isRestricted: false,
  metricsBlurred: false,
  refetch: () => undefined,
});

export function BillingAccessProvider({
  storeId,
  children,
}: {
  storeId?: string;
  children: ReactNode;
}) {
  const { data: access, isLoading, isError, refetch } = useBillingAccess(storeId);

  return (
    <BillingAccessContext.Provider
      value={{
        access,
        isLoading,
        isError,
        isRestricted: Boolean(access?.billingRestricted),
        metricsBlurred: Boolean(access?.metricsBlurred),
        refetch: () => {
          void refetch();
        },
      }}
    >
      {children}
    </BillingAccessContext.Provider>
  );
}

export function useBillingAccessContext(): BillingAccessContextValue {
  return useContext(BillingAccessContext);
}

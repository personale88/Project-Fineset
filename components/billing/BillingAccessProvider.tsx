"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useBillingAccess } from "@/hooks/useBillingAccess";
import type { PortalBillingAccessState } from "@/lib/api/portal-billing-access";

interface BillingAccessContextValue {
  access: PortalBillingAccessState | undefined;
  isLoading: boolean;
  isRestricted: boolean;
}

const BillingAccessContext = createContext<BillingAccessContextValue>({
  access: undefined,
  isLoading: true,
  isRestricted: false,
});

export function BillingAccessProvider({
  storeId,
  children,
}: {
  storeId?: string;
  children: ReactNode;
}) {
  const { data: access, isLoading } = useBillingAccess(storeId);

  return (
    <BillingAccessContext.Provider
      value={{
        access,
        isLoading,
        isRestricted: Boolean(access?.billingRestricted),
      }}
    >
      {children}
    </BillingAccessContext.Provider>
  );
}

export function useBillingAccessContext(): BillingAccessContextValue {
  return useContext(BillingAccessContext);
}

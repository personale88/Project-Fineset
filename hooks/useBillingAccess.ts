"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchPortalBillingAccess,
  type PortalBillingAccessState,
} from "@/lib/api/portal-billing-access";

export function useBillingAccess(storeId?: string) {
  return useQuery<PortalBillingAccessState>({
    queryKey: ["portal-billing-access", storeId ?? "session"],
    queryFn: () => fetchPortalBillingAccess(storeId),
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
}

export function useBillingDataRestricted(storeId?: string): boolean {
  const { data } = useBillingAccess(storeId);
  return Boolean(data?.billingRestricted);
}

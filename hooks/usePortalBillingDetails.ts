"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchPortalBillingDetails,
  type PortalBillingDetailsDto,
} from "@/lib/api/portal-billing-details";

export function usePortalBillingDetails() {
  return useQuery<PortalBillingDetailsDto>({
    queryKey: ["portal-billing-details"],
    queryFn: fetchPortalBillingDetails,
    staleTime: 60_000,
    retry: 1,
  });
}

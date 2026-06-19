import { useQuery } from "@tanstack/react-query";
import { getCustomerProfile } from "@/lib/api/customers";
import { LIVE_QUERY_OPTIONS } from "@/lib/sync/constants";

interface UseCustomerProfileParams {
  customerId?: string | null;
  visitId?: string | null;
  fieldSaleId?: string | null;
  storeId?: string | null;
  enabled?: boolean;
}

export function useCustomerProfile({
  customerId,
  visitId,
  fieldSaleId,
  storeId,
  enabled = true,
}: UseCustomerProfileParams) {
  const canFetch = enabled && Boolean(customerId || visitId || fieldSaleId);

  return useQuery({
    queryKey: [
      "customer-profile",
      customerId ?? null,
      visitId ?? null,
      fieldSaleId ?? null,
      storeId ?? null,
    ],
    queryFn: () =>
      getCustomerProfile({
        customerId: customerId ?? undefined,
        visitId: visitId ?? undefined,
        fieldSaleId: fieldSaleId ?? undefined,
        storeId: storeId ?? undefined,
      }),
    enabled: canFetch,
    ...LIVE_QUERY_OPTIONS,
  });
}

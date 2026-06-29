import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getStoreWorkQueue } from "@/lib/api/store-work-queue";
import type { PeriodValue } from "@/components/shared/PeriodSwitcher";
import { LIVE_QUERY_OPTIONS } from "@/lib/sync/constants";

export function useStoreWorkQueue(
  storeId?: string | null,
  limit = 30,
  period?: PeriodValue,
) {
  return useQuery({
    queryKey: ["store-work-queue", storeId ?? "portfolio", limit, period ?? "default"],
    queryFn: () => getStoreWorkQueue(storeId, limit, period),
    placeholderData: keepPreviousData,
    ...LIVE_QUERY_OPTIONS,
  });
}

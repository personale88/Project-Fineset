import { useQuery } from "@tanstack/react-query";
import { getMyStores } from "@/lib/api/store-portal";
import { LIVE_QUERY_OPTIONS } from "@/lib/sync/constants";
import type { MyStoresResponse } from "@/types";

interface UseMyStoresOptions {
  initialData?: MyStoresResponse;
}

export function useMyStores(options?: UseMyStoresOptions) {
  return useQuery({
    queryKey: ["store", "my-stores"],
    queryFn: getMyStores,
    initialData: options?.initialData,
    ...LIVE_QUERY_OPTIONS,
    refetchOnMount: "always",
  });
}

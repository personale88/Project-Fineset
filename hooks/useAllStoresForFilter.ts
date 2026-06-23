import { useQuery } from "@tanstack/react-query";
import { getStores } from "@/lib/api/stores";
import { LIVE_QUERY_OPTIONS } from "@/lib/sync/constants";

const PAGE_SIZE = 100;

async function fetchAllActiveStores() {
  const first = await getStores({ page: 1, pageSize: PAGE_SIZE, activeOnly: true });
  const all = [...first.data];
  const totalPages = Math.ceil(first.total / PAGE_SIZE);

  for (let page = 2; page <= totalPages; page += 1) {
    const next = await getStores({ page, pageSize: PAGE_SIZE, activeOnly: true });
    all.push(...next.data);
  }

  return { data: all, total: first.total };
}

export function useAllStoresForFilter() {
  return useQuery({
    queryKey: ["stores", "all-active-filter"],
    queryFn: fetchAllActiveStores,
    ...LIVE_QUERY_OPTIONS,
    staleTime: 60_000,
  });
}

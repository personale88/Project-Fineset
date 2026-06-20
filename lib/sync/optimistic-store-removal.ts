import type { QueryClient } from "@tanstack/react-query";
import type {
  AdminDashboardOverview,
  MyStoresResponse,
  StoreManagerPortfolio,
} from "@/types";

export function removeStoreFromClientCaches(
  queryClient: QueryClient,
  storeId: string,
): void {
  const adminSnapshots = queryClient.getQueriesData<AdminDashboardOverview>({
    queryKey: ["analytics", "admin", "overview"],
  });
  for (const [key, data] of adminSnapshots) {
    if (!data) continue;
    queryClient.setQueryData<AdminDashboardOverview>(key, {
      ...data,
      totalStores: Math.max(0, data.totalStores - 1),
      activeStores: Math.max(0, data.activeStores - 1),
      stores: data.stores.filter((store) => store.storeId !== storeId),
    });
  }

  const portfolioSnapshots = queryClient.getQueriesData<StoreManagerPortfolio>({
    queryKey: ["analytics", "store", "portfolio"],
  });
  for (const [key, data] of portfolioSnapshots) {
    if (!data) continue;
    queryClient.setQueryData<StoreManagerPortfolio>(key, {
      ...data,
      stores: data.stores.filter((store) => store.storeId !== storeId),
    });
  }

  const myStoresSnapshots = queryClient.getQueriesData<MyStoresResponse>({
    queryKey: ["store", "my-stores"],
  });
  for (const [key, data] of myStoresSnapshots) {
    if (!data) continue;
    queryClient.setQueryData<MyStoresResponse>(key, {
      ...data,
      data: data.data.filter((store) => store.id !== storeId),
    });
  }
}

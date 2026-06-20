import { apiFetch, buildQueryString } from "@/lib/api/client";
import type { StoreActivityItem } from "@/lib/services/store-activity";

export async function getStoreActivity(
  limit = 50,
  storeId?: string | null,
): Promise<StoreActivityItem[]> {
  return apiFetch<StoreActivityItem[]>(
    `/api/dashboard/store-activity${buildQueryString({ limit, storeId })}`,
  );
}

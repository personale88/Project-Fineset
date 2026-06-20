import { apiFetch, buildQueryString } from "@/lib/api/client";
import type { PeriodValue } from "@/components/shared/PeriodSwitcher";
import type { StaffWorkQueueResponse } from "@/types/staff-work-queue";

export async function getStoreWorkQueue(
  storeId?: string | null,
  limit = 30,
  period?: PeriodValue,
): Promise<StaffWorkQueueResponse> {
  return apiFetch<StaffWorkQueueResponse>(
    `/api/dashboard/store-work-queue${buildQueryString({ storeId, limit, period })}`,
  );
}

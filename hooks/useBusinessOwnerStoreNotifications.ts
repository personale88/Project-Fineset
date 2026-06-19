"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch, buildQueryString } from "@/lib/api/client";
import { LIVE_QUERY_OPTIONS } from "@/lib/sync/constants";
import type { OverdueAlertItem } from "@/lib/services/store-dashboard-notifications.types";
import type { PeriodValue } from "@/components/shared/PeriodSwitcher";

export function useBusinessOwnerStoreNotifications(period: PeriodValue) {
  return useQuery({
    queryKey: ["business-owner-store-notifications", period],
    queryFn: () =>
      apiFetch<{ data: OverdueAlertItem[] }>(
        `/api/dashboard/store-notifications${buildQueryString({ period })}`,
      ),
    ...LIVE_QUERY_OPTIONS,
  });
}

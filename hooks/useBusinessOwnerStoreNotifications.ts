"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { LIVE_QUERY_OPTIONS } from "@/lib/sync/constants";
import type { StaffMissedSummary } from "@/lib/services/store-dashboard-notifications.types";

export function useBusinessOwnerStoreNotifications() {
  return useQuery({
    queryKey: ["business-owner-store-notifications"],
    queryFn: () =>
      apiFetch<{ data: StaffMissedSummary[] }>(
        "/api/dashboard/store-notifications",
      ),
    ...LIVE_QUERY_OPTIONS,
  });
}

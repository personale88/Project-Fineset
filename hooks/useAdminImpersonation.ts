"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { setAdminImpersonation } from "@/lib/api/impersonation";
import { invalidatePortalData } from "@/lib/sync/invalidate-portal-data";

export function useAdminImpersonation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (storeId: string | null) => setAdminImpersonation(storeId),
    onSuccess: () => {
      void invalidatePortalData(queryClient);
      window.location.reload();
    },
  });
}

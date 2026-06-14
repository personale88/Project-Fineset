"use client";

import { content } from "@/content/en";
import { StaffCallList } from "@/components/staff/StaffCallList";
import { StoreScopedSection } from "@/components/store/StoreScopedSection";
import { storeDetailPathForRole } from "@/lib/utils/store-dashboard-url";
import type { GetStaffCallsParams, StaffCallListResponse } from "@/types";

interface StoreCallsPageClientProps {
  portalRole?: "STORE_MANAGER" | "BUSINESS_OWNER";
  urlStoreId?: string;
  initialCalls?: StaffCallListResponse;
  initialCallsParams?: GetStaffCallsParams;
}

export function StoreCallsPageClient({
  portalRole = "BUSINESS_OWNER",
  urlStoreId,
  initialCalls,
  initialCallsParams,
}: StoreCallsPageClientProps) {
  const store = content.store;

  return (
    <StoreScopedSection store={store}>
      {(activeStoreId) => {
        const canUseInitialData =
          (!urlStoreId || urlStoreId === activeStoreId) &&
          (!initialCallsParams?.storeId || initialCallsParams.storeId === activeStoreId);

        return (
          <StaffCallList
            copy={content.staff}
            emptyMessage={content.empty.staffCalls}
            storeId={activeStoreId}
            initialCallsParams={canUseInitialData ? initialCallsParams : undefined}
            initialData={canUseInitialData ? initialCalls : undefined}
            initialParams={canUseInitialData ? initialCallsParams : undefined}
            backHref={storeDetailPathForRole(activeStoreId, portalRole)}
          />
        );
      }}
    </StoreScopedSection>
  );
}

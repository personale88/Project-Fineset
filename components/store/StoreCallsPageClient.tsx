"use client";

import { content } from "@/content/en";
import { StaffCallList } from "@/components/staff/StaffCallList";
import { StoreScopedSection } from "@/components/store/StoreScopedSection";
import {
  portalListBackHref,
} from "@/lib/utils/store-dashboard-url";
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
            pageTitle={content.portal.calls.title}
            pageSubtitle={content.portal.calls.subtitle}
            backLabel={content.store.storeDetail.backToPortal}
            emptyMessage={content.empty.staffCalls}
            storeId={activeStoreId}
            showImport={portalRole === "BUSINESS_OWNER"}
            initialCallsParams={canUseInitialData ? initialCallsParams : undefined}
            initialData={canUseInitialData ? initialCalls : undefined}
            initialParams={canUseInitialData ? initialCallsParams : undefined}
            backHref={portalListBackHref(portalRole, activeStoreId)}
          />
        );
      }}
    </StoreScopedSection>
  );
}

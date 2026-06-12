"use client";

import { content } from "@/content/en";
import { StaffCallList } from "@/components/staff/StaffCallList";
import { StoreScopedSection } from "@/components/store/StoreScopedSection";
import { storeDetailPath } from "@/lib/utils/store-dashboard-url";
import type { GetStaffCallsParams, StaffCallListResponse } from "@/types";

interface StoreCallsPageClientProps {
  urlStoreId?: string;
  initialCalls?: StaffCallListResponse;
  initialCallsParams?: GetStaffCallsParams;
}

export function StoreCallsPageClient({
  urlStoreId,
  initialCalls,
  initialCallsParams,
}: StoreCallsPageClientProps) {
  const store = content.store;

  return (
    <StoreScopedSection store={store}>
      {(activeStoreId) => (
        <StaffCallList
          copy={content.staff}
          emptyMessage={content.empty.staffCalls}
          storeId={activeStoreId}
          initialCallsParams={
            urlStoreId === activeStoreId ? initialCallsParams : undefined
          }
          initialData={urlStoreId === activeStoreId ? initialCalls : undefined}
          initialParams={urlStoreId === activeStoreId ? initialCallsParams : undefined}
          backHref={storeDetailPath(activeStoreId)}
        />
      )}
    </StoreScopedSection>
  );
}

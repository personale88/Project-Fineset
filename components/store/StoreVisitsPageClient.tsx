"use client";

import { content } from "@/content/en";
import { StoreScopedSection } from "@/components/store/StoreScopedSection";
import { StoreVisitsLog } from "@/components/store/StoreVisitsLog";
import {
  portalListBackHref,
  storeDetailBackLabel,
} from "@/lib/utils/store-dashboard-url";
import type { GetVisitsParams, PaginatedResponse, VisitListItem } from "@/types";
import type { getStaff } from "@/lib/api/staff";

interface StoreVisitsPageClientProps {
  portalRole?: "STORE_MANAGER" | "BUSINESS_OWNER";
  initialVisits?: PaginatedResponse<VisitListItem>;
  initialVisitsParams?: GetVisitsParams;
  initialStaff?: Awaited<ReturnType<typeof getStaff>>;
  urlStoreId?: string;
  highlightRecordId?: string;
}

export function StoreVisitsPageClient({
  portalRole = "BUSINESS_OWNER",
  initialVisits,
  initialVisitsParams,
  initialStaff,
  urlStoreId,
  highlightRecordId,
}: StoreVisitsPageClientProps) {
  const store = content.store;
  const backLabel = storeDetailBackLabel(portalRole, store.storeDetail);

  return (
    <StoreScopedSection store={store}>
      {(storeId) => {
        const canUseInitialData =
          (!urlStoreId || urlStoreId === storeId) &&
          (!initialVisitsParams?.storeId || initialVisitsParams.storeId === storeId);

        return (
          <StoreVisitsLog
            store={store}
            storeId={storeId}
            visitFields={content.visitForm.fields}
            common={content.common}
            emptyMessage={content.empty.visits}
            initialVisits={canUseInitialData ? initialVisits : undefined}
            initialVisitsParams={canUseInitialData ? initialVisitsParams : undefined}
            initialStaff={canUseInitialData ? initialStaff : undefined}
            backHref={portalListBackHref(portalRole, storeId)}
            backLabel={backLabel}
            showImport={portalRole === "BUSINESS_OWNER"}
            viewOnlySubtitle={
              portalRole === "BUSINESS_OWNER" ? store.visits.viewOnlySubtitle : undefined
            }
            highlightRecordId={highlightRecordId}
          />
        );
      }}
    </StoreScopedSection>
  );
}

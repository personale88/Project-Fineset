"use client";

import { content } from "@/content/en";
import { PortalFieldSalesLog } from "@/components/portal/PortalFieldSalesLog";
import { StoreScopedSection } from "@/components/store/StoreScopedSection";
import {
  portalListBackHref,
  storeDetailBackLabel,
} from "@/lib/utils/store-dashboard-url";
import type { FieldSaleListResponse, GetFieldSalesListParams } from "@/types";

interface StoreFieldSalesPageClientProps {
  portalRole?: "STORE_MANAGER" | "BUSINESS_OWNER";
  urlStoreId?: string;
  initialFieldSales?: FieldSaleListResponse;
  initialFieldSalesParams?: GetFieldSalesListParams;
}

export function StoreFieldSalesPageClient({
  portalRole = "BUSINESS_OWNER",
  urlStoreId,
  initialFieldSales,
  initialFieldSalesParams,
}: StoreFieldSalesPageClientProps) {
  const store = content.store;
  const backLabel = storeDetailBackLabel(portalRole, store.storeDetail);

  return (
    <StoreScopedSection store={store}>
      {(activeStoreId) => {
        const canUseInitialData =
          (!urlStoreId || urlStoreId === activeStoreId) &&
          (!initialFieldSalesParams?.storeId ||
            initialFieldSalesParams.storeId === activeStoreId);

        return (
          <PortalFieldSalesLog
            copy={content.portal.fieldSales}
            common={content.common}
            emptyMessage={content.empty.fieldSales}
            allStoresLabel={content.portal.allStores}
            allStaffLabel={content.portal.allStaff}
            initialStoreId={activeStoreId}
            initialFieldSales={canUseInitialData ? initialFieldSales : undefined}
            initialFieldSalesParams={
              canUseInitialData ? initialFieldSalesParams : undefined
            }
            backHref={portalListBackHref(portalRole, activeStoreId)}
            backLabel={backLabel}
          />
        );
      }}
    </StoreScopedSection>
  );
}

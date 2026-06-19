"use client";

import { content } from "@/content/en";
import { StoreScopedSection } from "@/components/store/StoreScopedSection";
import { StaffManagement } from "@/components/store/StaffManagement";
import {
  portalListBackHref,
  storeDetailBackLabel,
} from "@/lib/utils/store-dashboard-url";
import type { getStaff } from "@/lib/api/staff";

interface StoreStaffPageClientProps {
  portalRole?: "STORE_MANAGER" | "BUSINESS_OWNER";
  initialStaff?: Awaited<ReturnType<typeof getStaff>>;
  urlStoreId?: string;
}

export function StoreStaffPageClient({
  portalRole = "BUSINESS_OWNER",
  initialStaff,
  urlStoreId,
}: StoreStaffPageClientProps) {
  const store = content.store;
  const backLabel = storeDetailBackLabel(portalRole, store.storeDetail);

  return (
    <StoreScopedSection store={store}>
      {(storeId) => {
        const canUseInitialData = !urlStoreId || urlStoreId === storeId;

        return (
          <StaffManagement
            store={store}
            storeId={storeId}
            emptyMessage={content.empty.staff}
            errors={content.errors}
            initialStaff={canUseInitialData ? initialStaff : undefined}
            backHref={portalListBackHref(portalRole, storeId)}
            backLabel={backLabel}
            readOnly={portalRole === "STORE_MANAGER"}
            showImport={portalRole === "BUSINESS_OWNER"}
          />
        );
      }}
    </StoreScopedSection>
  );
}

"use client";

import { content } from "@/content/en";
import { StaffWorkQueue } from "@/components/staff/StaffWorkQueue";
import { STORE_MANAGER_DASHBOARD_PATH } from "@/lib/auth/routes";

export function StoreManagerPersonalWorkQueue({ storeId }: { storeId: string }) {
  const copy = content.store.managerDashboard.personalWorkQueue;
  return (
      <StaffWorkQueue
      portalBasePath={STORE_MANAGER_DASHBOARD_PATH}
      title={copy.title}
      subtitle={copy.subtitle}
      callsPath={`${STORE_MANAGER_DASHBOARD_PATH}/my-calls`}
      browseVariant="store_manager_personal"
      browseStoreId={storeId}
      callFlowStoreId={storeId}
    />
  );
}

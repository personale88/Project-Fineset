"use client";

import { content } from "@/content/en";
import { FollowUpList } from "@/components/staff/FollowUpList";
import { StoreScopedSection } from "@/components/store/StoreScopedSection";
import { BUSINESS_OWNER_DASHBOARD_PATH } from "@/lib/auth/routes";
import type { FollowUpFilter } from "@/hooks/useFollowUps";

interface BusinessOwnerFollowUpsPageClientProps {
  filter: FollowUpFilter;
}

export function BusinessOwnerFollowUpsPageClient({
  filter,
}: BusinessOwnerFollowUpsPageClientProps) {
  return (
    <StoreScopedSection store={content.store}>
      {(storeId) => (
        <FollowUpList
          storeId={storeId}
          canAssign
          backHref={BUSINESS_OWNER_DASHBOARD_PATH}
          followUpsBasePath={`${BUSINESS_OWNER_DASHBOARD_PATH}/follow-ups?storeId=${storeId}`}
          filter={filter}
          copy={content.store.managerDashboard.followUps.store}
        />
      )}
    </StoreScopedSection>
  );
}

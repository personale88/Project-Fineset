import { content } from "@/content/en";
import { FollowUpList } from "@/components/staff/FollowUpList";
import { ManagerActorSetupGate } from "@/components/store/ManagerActorSetupGate";
import { requirePortalSession } from "@/lib/auth/require-portal-session";
import { STORE_MANAGER_DASHBOARD_PATH } from "@/lib/auth/routes";
import { parseFollowUpFilter } from "@/lib/utils/follow-ups-url";
import { storeManagerMyWorkHubHref } from "@/lib/utils/store-dashboard-url";

interface StoreManagerMyFollowUpsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function StoreManagerMyFollowUpsPage({
  searchParams,
}: StoreManagerMyFollowUpsPageProps) {
  await requirePortalSession("STORE_MANAGER");
  const resolved = await searchParams;

  return (
    <ManagerActorSetupGate requireLink>
      <FollowUpList
        personalScope
        backHref={storeManagerMyWorkHubHref()}
        followUpsBasePath={`${STORE_MANAGER_DASHBOARD_PATH}/my-follow-ups`}
        filter={parseFollowUpFilter(resolved.filter)}
        copy={content.store.managerDashboard.followUps.personal}
      />
    </ManagerActorSetupGate>
  );
}

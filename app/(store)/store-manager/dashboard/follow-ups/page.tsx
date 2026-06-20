import { content } from "@/content/en";
import { FollowUpList } from "@/components/staff/FollowUpList";
import { requirePortalSession } from "@/lib/auth/require-portal-session";
import { STORE_MANAGER_DASHBOARD_PATH } from "@/lib/auth/routes";
import { parseFollowUpFilter, parseViewStaffId } from "@/lib/utils/follow-ups-url";
import { storeManagerTeamHubHref } from "@/lib/utils/store-dashboard-url";

interface StoreManagerFollowUpsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function StoreManagerFollowUpsPage({
  searchParams,
}: StoreManagerFollowUpsPageProps) {
  const session = await requirePortalSession("STORE_MANAGER");
  const resolved = await searchParams;

  return (
    <FollowUpList
      storeId={session.storeId}
      viewStaffId={parseViewStaffId(resolved.viewStaffId)}
      canAssign
      backHref={storeManagerTeamHubHref()}
      followUpsBasePath={`${STORE_MANAGER_DASHBOARD_PATH}/follow-ups`}
      filter={parseFollowUpFilter(resolved.filter)}
      copy={content.store.managerDashboard.followUps.store}
    />
  );
}

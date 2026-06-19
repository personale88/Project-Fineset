import { content } from "@/content/en";
import { FollowUpList } from "@/components/staff/FollowUpList";
import { requirePortalSession } from "@/lib/auth/require-portal-session";
import { STORE_MANAGER_DASHBOARD_PATH } from "@/lib/auth/routes";
import { parseFollowUpFilter } from "@/lib/utils/follow-ups-url";

interface StoreManagerMyFollowUpsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function StoreManagerMyFollowUpsPage({
  searchParams,
}: StoreManagerMyFollowUpsPageProps) {
  await requirePortalSession("STORE_MANAGER");
  const resolved = await searchParams;

  return (
    <FollowUpList
      personalScope
      backHref={STORE_MANAGER_DASHBOARD_PATH}
      filter={parseFollowUpFilter(resolved.filter)}
      copy={content.store.managerDashboard.followUps.personal}
    />
  );
}

import { content } from "@/content/en";
import { FollowUpList } from "@/components/staff/FollowUpList";
import { requirePortalSession } from "@/lib/auth/require-portal-session";
import { STORE_MANAGER_DASHBOARD_PATH } from "@/lib/auth/routes";

export default async function StoreManagerFollowUpsPage() {
  const session = await requirePortalSession("STORE_MANAGER");

  return (
    <FollowUpList
      storeId={session.storeId}
      canAssign
      backHref={STORE_MANAGER_DASHBOARD_PATH}
    />
  );
}

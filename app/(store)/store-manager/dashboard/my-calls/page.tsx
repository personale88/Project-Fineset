import { content } from "@/content/en";
import { StaffCallList } from "@/components/staff/StaffCallList";
import { ManagerActorSetupGate } from "@/components/store/ManagerActorSetupGate";
import { fetchInitialStoreManagerCalls } from "@/lib/data/staff-calls";
import { requirePortalSession } from "@/lib/auth/require-portal-session";
import { parseStaffCallsSearchParams } from "@/lib/utils/staff-calls-url";
import { storeManagerMyWorkHubHref } from "@/lib/utils/store-dashboard-url";

interface StoreManagerMyCallsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function StoreManagerMyCallsPage({
  searchParams,
}: StoreManagerMyCallsPageProps) {
  const session = await requirePortalSession("STORE_MANAGER");
  const resolved = await searchParams;
  const urlFilters = parseStaffCallsSearchParams(resolved);
  const initial = await fetchInitialStoreManagerCalls(urlFilters);

  return (
    <ManagerActorSetupGate requireLink>
      <StaffCallList
        copy={content.staff}
        pageTitle={content.store.managerDashboard.actions.personal.callUsers.title}
        pageSubtitle={content.store.managerDashboard.actions.personal.callUsers.description}
        backLabel={content.common.back}
        emptyMessage={content.empty.staffCalls}
        storeId={session.storeId}
        personalScope
        canAssign={false}
        initialCallsParams={initial?.params ?? { personalScope: true }}
        initialData={initial?.data}
        initialParams={initial?.params}
        backHref={storeManagerMyWorkHubHref()}
      />
    </ManagerActorSetupGate>
  );
}

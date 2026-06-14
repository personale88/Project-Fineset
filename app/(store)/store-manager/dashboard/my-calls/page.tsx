import { content } from "@/content/en";
import { StaffCallList } from "@/components/staff/StaffCallList";
import { fetchInitialStoreManagerCalls } from "@/lib/data/staff-calls";
import { STORE_MANAGER_DASHBOARD_PATH } from "@/lib/auth/routes";
import { parseStaffCallsSearchParams } from "@/lib/utils/staff-calls-url";

interface StoreManagerMyCallsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function StoreManagerMyCallsPage({
  searchParams,
}: StoreManagerMyCallsPageProps) {
  const resolved = await searchParams;
  const urlFilters = parseStaffCallsSearchParams(resolved);
  const initial = await fetchInitialStoreManagerCalls(urlFilters);

  return (
    <StaffCallList
      copy={content.staff}
      emptyMessage={content.empty.staffCalls}
      initialCallsParams={urlFilters}
      initialData={initial?.data}
      initialParams={initial?.params}
      backHref={STORE_MANAGER_DASHBOARD_PATH}
    />
  );
}

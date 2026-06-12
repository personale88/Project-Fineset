import { content } from "@/content/en";
import { StaffCallList } from "@/components/staff/StaffCallList";
import { fetchInitialAdminCalls } from "@/lib/data/staff-calls";
import { adminStoreDetailPath } from "@/lib/utils/admin-dashboard-url";
import { parseStaffCallsSearchParams } from "@/lib/utils/staff-calls-url";

interface AdminCallsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminCallsPage({ searchParams }: AdminCallsPageProps) {
  const resolved = await searchParams;
  const storeId = typeof resolved.storeId === "string" ? resolved.storeId : undefined;

  if (!storeId) {
    return (
      <p className="text-sm text-text-secondary">
        {content.store.portfolio.selectStorePrompt}
      </p>
    );
  }

  const urlFilters = parseStaffCallsSearchParams(resolved);
  const initial = await fetchInitialAdminCalls(storeId, urlFilters);

  return (
    <StaffCallList
      copy={content.staff}
      emptyMessage={content.empty.staffCalls}
      storeId={storeId}
      initialCallsParams={urlFilters}
      initialData={initial?.data}
      initialParams={initial?.params}
      backHref={adminStoreDetailPath(storeId)}
    />
  );
}

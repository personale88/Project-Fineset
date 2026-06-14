import { StoreCallsPageClient } from "@/components/store/StoreCallsPageClient";
import { fetchInitialStorePortalCalls } from "@/lib/data/staff-calls";
import { parseStaffCallsSearchParams } from "@/lib/utils/staff-calls-url";

interface StoreManagerCallsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function StoreManagerCallsPage({
  searchParams,
}: StoreManagerCallsPageProps) {
  const resolved = await searchParams;
  const urlFilters = parseStaffCallsSearchParams(resolved);
  const storeId =
    typeof resolved.storeId === "string" ? resolved.storeId : undefined;

  let initial: Awaited<ReturnType<typeof fetchInitialStorePortalCalls>> = null;
  try {
    initial = await fetchInitialStorePortalCalls(storeId, urlFilters);
  } catch (error) {
    console.error("[store-manager-calls] initial staff calls failed", {
      storeId,
      error,
    });
  }

  return (
    <StoreCallsPageClient
      portalRole="STORE_MANAGER"
      urlStoreId={initial?.params.storeId ?? storeId}
      initialCalls={initial?.data}
      initialCallsParams={initial?.params}
    />
  );
}

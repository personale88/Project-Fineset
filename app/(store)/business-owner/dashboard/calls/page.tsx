import { StoreCallsPageClient } from "@/components/store/StoreCallsPageClient";
import { fetchInitialBusinessOwnerCalls } from "@/lib/data/staff-calls";
import { parseStaffCallsSearchParams } from "@/lib/utils/staff-calls-url";

interface StoreCallsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function StoreCallsPage({ searchParams }: StoreCallsPageProps) {
  const resolved = await searchParams;
  const urlFilters = parseStaffCallsSearchParams(resolved);
  const storeId =
    typeof resolved.storeId === "string" ? resolved.storeId : undefined;

  let initial: Awaited<ReturnType<typeof fetchInitialBusinessOwnerCalls>> = null;
  if (storeId) {
    try {
      initial = await fetchInitialBusinessOwnerCalls(storeId, urlFilters);
    } catch (error) {
      console.error("[store-calls] initial staff calls failed", { storeId, error });
    }
  }

  return (
    <StoreCallsPageClient
      urlStoreId={storeId}
      initialCalls={initial?.data}
      initialCallsParams={initial?.params}
    />
  );
}

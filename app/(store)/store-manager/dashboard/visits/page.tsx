import { StoreVisitsPageClient } from "@/components/store/StoreVisitsPageClient";
import { fetchInitialStoreStaff } from "@/lib/data/staff";
import { fetchInitialVisits } from "@/lib/data/visits";

interface StoreManagerVisitsPageProps {
  searchParams: Promise<{ storeId?: string; highlight?: string }>;
}

export default async function StoreManagerVisitsPage({
  searchParams,
}: StoreManagerVisitsPageProps) {
  const { storeId, highlight } = await searchParams;
  let initialVisits: Awaited<ReturnType<typeof fetchInitialVisits>> = null;
  let initialStaff: Awaited<ReturnType<typeof fetchInitialStoreStaff>> = null;
  try {
    [initialVisits, initialStaff] = await Promise.all([
      fetchInitialVisits(storeId),
      fetchInitialStoreStaff(storeId),
    ]);
  } catch (error) {
    console.error("[store-manager-visits] initial data failed", { storeId, error });
  }

  const resolvedStoreId = initialVisits?.params.storeId ?? storeId;

  return (
    <StoreVisitsPageClient
      portalRole="STORE_MANAGER"
      urlStoreId={resolvedStoreId}
      initialVisits={initialVisits?.data}
      initialVisitsParams={initialVisits?.params}
      initialStaff={initialStaff?.data}
      highlightRecordId={typeof highlight === "string" ? highlight : undefined}
    />
  );
}

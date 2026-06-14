import { StoreStaffPageClient } from "@/components/store/StoreStaffPageClient";
import { fetchInitialStoreStaff } from "@/lib/data/staff";

interface StoreManagerStaffPageProps {
  searchParams: Promise<{ storeId?: string }>;
}

export default async function StoreManagerStaffPage({
  searchParams,
}: StoreManagerStaffPageProps) {
  const { storeId } = await searchParams;
  let initial: Awaited<ReturnType<typeof fetchInitialStoreStaff>> = null;
  try {
    initial = await fetchInitialStoreStaff(storeId);
  } catch (error) {
    console.error("[store-manager-staff] initial staff failed", { storeId, error });
  }

  return (
    <StoreStaffPageClient
      portalRole="STORE_MANAGER"
      urlStoreId={initial?.storeId ?? storeId}
      initialStaff={initial?.data}
    />
  );
}

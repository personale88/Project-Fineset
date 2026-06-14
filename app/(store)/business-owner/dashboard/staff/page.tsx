import { StoreStaffPageClient } from "@/components/store/StoreStaffPageClient";
import { fetchInitialStoreStaff } from "@/lib/data/staff";

interface StoreStaffPageProps {
  searchParams: Promise<{ storeId?: string }>;
}

export default async function StoreStaffPage({ searchParams }: StoreStaffPageProps) {
  const { storeId } = await searchParams;
  let initial: Awaited<ReturnType<typeof fetchInitialStoreStaff>> = null;
  try {
    initial = await fetchInitialStoreStaff(storeId);
  } catch (error) {
    console.error("[store-staff] initial staff failed", { storeId, error });
  }

  return (
    <StoreStaffPageClient
      urlStoreId={initial?.storeId ?? storeId}
      initialStaff={initial?.data}
    />
  );
}

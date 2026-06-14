import { StoreFieldSalesPageClient } from "@/components/store/StoreFieldSalesPageClient";
import { fetchInitialFieldSales } from "@/lib/data/field-sales";
import { parseFieldSalesSearchParams } from "@/lib/utils/field-sales-url";

interface StoreManagerFieldSalesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function StoreManagerFieldSalesPage({
  searchParams,
}: StoreManagerFieldSalesPageProps) {
  const resolved = await searchParams;
  const urlFilters = parseFieldSalesSearchParams(resolved);
  const storeId =
    typeof resolved.storeId === "string" ? resolved.storeId : undefined;

  let initial: Awaited<ReturnType<typeof fetchInitialFieldSales>> = null;
  try {
    initial = await fetchInitialFieldSales(storeId, urlFilters);
  } catch (error) {
    console.error("[store-manager-field-sales] initial field sales failed", {
      storeId,
      error,
    });
  }

  return (
    <StoreFieldSalesPageClient
      portalRole="STORE_MANAGER"
      urlStoreId={initial?.params.storeId ?? storeId}
      initialFieldSales={initial?.data}
      initialFieldSalesParams={initial?.params}
    />
  );
}

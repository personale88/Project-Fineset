import { content } from "@/content/en";
import { AdminStoreSectionShell } from "@/components/admin/AdminStoreSectionShell";
import { PortalFieldSalesLog } from "@/components/portal/PortalFieldSalesLog";
import { fetchInitialFieldSales } from "@/lib/data/field-sales";
import { adminStoreDetailPath } from "@/lib/utils/admin-dashboard-url";

interface AdminFieldSalesPageProps {
  searchParams: Promise<{ storeId?: string }>;
}

export default async function AdminFieldSalesPage({
  searchParams,
}: AdminFieldSalesPageProps) {
  const { storeId } = await searchParams;
  const initial = await fetchInitialFieldSales(storeId);

  const log = (
    <PortalFieldSalesLog
      copy={content.portal.fieldSales}
      common={content.common}
      emptyMessage={content.empty.fieldSales}
      allStoresLabel={content.portal.allStores}
      allStaffLabel={content.portal.allStaff}
      showStoreFilter
      initialStoreId={storeId}
      initialFieldSales={initial?.data}
      initialFieldSalesParams={initial?.params}
      backHref={storeId ? adminStoreDetailPath(storeId) : undefined}
      backLabel={content.common.back}
    />
  );

  if (!storeId) return log;

  return (
    <AdminStoreSectionShell admin={content.admin} storeId={storeId} section="field-sales">
      {log}
    </AdminStoreSectionShell>
  );
}

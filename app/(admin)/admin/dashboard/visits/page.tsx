import { content } from "@/content/en";
import { StoreVisitsLog } from "@/components/store/StoreVisitsLog";
import { fetchInitialStoreStaff } from "@/lib/data/staff";
import { fetchInitialVisits } from "@/lib/data/visits";
import { adminStoreDetailPath } from "@/lib/utils/admin-dashboard-url";

interface AdminVisitsPageProps {
  searchParams: Promise<{ storeId?: string }>;
}

export default async function AdminVisitsPage({
  searchParams,
}: AdminVisitsPageProps) {
  const { storeId } = await searchParams;

  if (!storeId) {
    return (
      <p className="text-sm text-text-secondary">
        {content.store.portfolio.selectStorePrompt}
      </p>
    );
  }

  let initialVisits: Awaited<ReturnType<typeof fetchInitialVisits>> = null;
  let initialStaff: Awaited<ReturnType<typeof fetchInitialStoreStaff>> = null;
  try {
    [initialVisits, initialStaff] = await Promise.all([
      fetchInitialVisits(storeId),
      fetchInitialStoreStaff(storeId),
    ]);
  } catch (error) {
    console.error("[admin-visits] initial data failed", { storeId, error });
  }

  return (
    <StoreVisitsLog
      store={content.store}
      storeId={storeId}
      visitFields={content.visitForm.fields}
      common={content.common}
      emptyMessage={content.empty.visits}
      initialVisits={initialVisits?.data}
      initialVisitsParams={initialVisits?.params}
      initialStaff={initialStaff?.data}
      backHref={adminStoreDetailPath(storeId)}
      backLabel={content.admin.storeDetail.backToPortfolio}
    />
  );
}

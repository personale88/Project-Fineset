import { content } from "@/content/en";
import { AdminStoreDetail } from "@/components/admin/AdminStoreDetail";
import { fetchInitialStoreOverviewBundle } from "@/lib/data/analytics";
import { parsePeriodParam } from "@/lib/utils/analytics-period-url";

interface AdminStoreDetailPageProps {
  params: Promise<{ storeId: string }>;
  searchParams: Promise<{ period?: string }>;
}

export default async function AdminStoreDetailPage({
  params,
  searchParams,
}: AdminStoreDetailPageProps) {
  const { storeId } = await params;
  const { period: periodParam } = await searchParams;
  const period = parsePeriodParam(periodParam);

  let initial: Awaited<ReturnType<typeof fetchInitialStoreOverviewBundle>> = null;
  try {
    initial = await fetchInitialStoreOverviewBundle({ storeId, period });
  } catch (error) {
    console.error("[admin-store-detail] initial overview failed", { storeId, error });
  }

  return (
    <AdminStoreDetail
      storeId={storeId}
      admin={content.admin}
      storeCopy={content.store}
      initialOverviewBundle={initial?.bundle}
      initialOverviewParams={initial?.params}
    />
  );
}

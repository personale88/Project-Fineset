import { content } from "@/content/en";
import { StoreDetailOverview } from "@/components/store/StoreDetailOverview";
import { getAppSession } from "@/lib/auth/get-app-session";
import { resolveStoreDetailAccess } from "@/lib/auth/store-portal-access";
import { fetchInitialStoreOverviewBundle } from "@/lib/data/analytics";
import { parsePeriodParam } from "@/lib/utils/analytics-period-url";

interface StoreManagerDetailPageProps {
  params: Promise<{ storeId: string }>;
  searchParams: Promise<{ period?: string }>;
}

export default async function StoreManagerDetailDashboardPage({
  params,
  searchParams,
}: StoreManagerDetailPageProps) {
  const { storeId: urlStoreId } = await params;
  const { period: periodParam } = await searchParams;
  const period = parsePeriodParam(periodParam);
  const session = await getAppSession();
  const storeId = await resolveStoreDetailAccess(session, urlStoreId, period);

  const initial = await fetchInitialStoreOverviewBundle({ storeId, period });

  return (
    <StoreDetailOverview
      storeId={storeId}
      store={content.store}
      portalRole="STORE_MANAGER"
      initialOverviewBundle={initial?.bundle}
      initialOverviewParams={initial?.params}
    />
  );
}

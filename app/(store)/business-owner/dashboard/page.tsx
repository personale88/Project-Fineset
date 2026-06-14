import { Suspense } from "react";
import { redirect } from "next/navigation";
import { content } from "@/content/en";
import { StorePortfolio } from "@/components/store/StorePortfolio";
import { getRedirectForRole } from "@/lib/auth/routes";
import { getAppSession } from "@/lib/auth/get-app-session";
import { fetchInitialStoreManagerPortfolio } from "@/lib/data/analytics";
import { parsePeriodParam } from "@/lib/utils/analytics-period-url";

interface StoreDashboardPageProps {
  searchParams: Promise<{ period?: string }>;
}

export default async function StoreDashboardPage({
  searchParams,
}: StoreDashboardPageProps) {
  const session = await getAppSession();
  if (!session) {
    redirect("/");
  }

  if (session.role !== "BUSINESS_OWNER") {
    redirect(getRedirectForRole(session.role));
  }

  const { period: periodParam } = await searchParams;
  const period = parsePeriodParam(periodParam);

  let initial: Awaited<ReturnType<typeof fetchInitialStoreManagerPortfolio>> = null;
  try {
    initial = await fetchInitialStoreManagerPortfolio({ period });
  } catch (error) {
    console.error("[store-dashboard] initial portfolio failed", error);
  }

  return (
    <Suspense fallback={null}>
      <StorePortfolio
        store={content.store}
        initialPortfolio={initial?.data}
        initialParams={initial?.params}
        initialPeriod={period}
      />
    </Suspense>
  );
}

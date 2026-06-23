import { content } from "@/content/en";
import { AdminOverview } from "@/components/admin/AdminOverview";
import { fetchInitialAdminOverview } from "@/lib/data/analytics";
import {
  initialLoadFailedFlag,
  unwrapInitialLoad,
} from "@/lib/data/initial-load";

export default async function AdminDashboardPage() {
  const initial = await fetchInitialAdminOverview();

  return (
    <AdminOverview
      admin={content.admin}
      initialOverview={unwrapInitialLoad(initial)}
      initialOverviewFailed={initialLoadFailedFlag(initial)}
    />
  );
}

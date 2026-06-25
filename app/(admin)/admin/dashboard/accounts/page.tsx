import { content } from "@/content/en";
import { AdminAccountsManagement } from "@/components/admin/AdminAccountsManagement";
import { fetchInitialAdminOverview } from "@/lib/data/analytics";
import {
  initialLoadFailedFlag,
  unwrapInitialLoad,
} from "@/lib/data/initial-load";

export default async function AdminAccountsPage() {
  const initial = await fetchInitialAdminOverview();

  return (
    <AdminAccountsManagement
      admin={content.admin}
      errors={content.errors}
      initialOverview={unwrapInitialLoad(initial)}
      initialOverviewFailed={initialLoadFailedFlag(initial)}
    />
  );
}

import { content } from "@/content/en";
import { AdminBillingPayments } from "@/components/admin/AdminBillingPayments";
import { fetchInitialAdminOverview } from "@/lib/data/analytics";
import {
  initialLoadFailedFlag,
  unwrapInitialLoad,
} from "@/lib/data/initial-load";

export default async function AdminBillingPage() {
  const initial = await fetchInitialAdminOverview();

  return (
    <AdminBillingPayments
      admin={content.admin}
      initialOverview={unwrapInitialLoad(initial)}
      initialOverviewFailed={initialLoadFailedFlag(initial)}
    />
  );
}

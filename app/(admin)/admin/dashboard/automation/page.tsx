import { Suspense } from "react";
import { content } from "@/content/en";
import { AdminAutomationCenter } from "@/components/admin/AdminAutomationCenter";
import { requireAdminBillingPageAccess } from "@/lib/auth/require-admin-billing-page";

export default async function AdminAutomationPage() {
  await requireAdminBillingPageAccess();

  return (
    <Suspense fallback={<p className="p-6 text-sm text-text-secondary">{content.admin.automation.loading}</p>}>
      <AdminAutomationCenter admin={content.admin} />
    </Suspense>
  );
}

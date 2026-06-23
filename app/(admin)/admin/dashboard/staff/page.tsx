import { redirect } from "next/navigation";
import { content } from "@/content/en";
import { AdminStoreSectionShell } from "@/components/admin/AdminStoreSectionShell";
import { StaffManagement } from "@/components/store/StaffManagement";
import { fetchInitialAdminStoreStaff } from "@/lib/data/staff";
import { adminStoreDetailPath } from "@/lib/utils/admin-dashboard-url";

interface AdminStaffPageProps {
  searchParams: Promise<{ storeId?: string }>;
}

export default async function AdminStaffPage({ searchParams }: AdminStaffPageProps) {
  const { storeId } = await searchParams;

  if (!storeId) {
    redirect("/admin/dashboard/accounts");
  }

  const initialStaff = await fetchInitialAdminStoreStaff(storeId);

  return (
    <AdminStoreSectionShell admin={content.admin} storeId={storeId} section="staff">
      <StaffManagement
        store={content.store}
        storeId={storeId}
        emptyMessage={content.empty.staff}
        errors={content.errors}
        initialStaff={initialStaff?.data}
        backHref={adminStoreDetailPath(storeId)}
        backLabel={content.common.back}
        showImport
      />
    </AdminStoreSectionShell>
  );
}

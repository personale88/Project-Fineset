import { redirect } from "next/navigation";
import { portalProfileSectionPath } from "@/lib/utils/store-dashboard-url";

interface StoreManagerStaffPageProps {
  searchParams: Promise<{ storeId?: string }>;
}

export default async function StoreManagerStaffPage({
  searchParams,
}: StoreManagerStaffPageProps) {
  const { storeId } = await searchParams;
  redirect(portalProfileSectionPath("STORE_MANAGER", "staff", storeId));
}

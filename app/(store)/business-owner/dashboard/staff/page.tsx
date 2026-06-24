import { redirect } from "next/navigation";
import { portalProfileSectionPath } from "@/lib/utils/store-dashboard-url";

interface StoreStaffPageProps {
  searchParams: Promise<{ storeId?: string }>;
}

export default async function StoreStaffPage({ searchParams }: StoreStaffPageProps) {
  const { storeId } = await searchParams;
  redirect(portalProfileSectionPath("BUSINESS_OWNER", "staff", storeId));
}

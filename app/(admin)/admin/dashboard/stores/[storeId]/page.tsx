import { redirect } from "next/navigation";

interface AdminLegacyStoreDetailRedirectProps {
  params: Promise<{ storeId: string }>;
  searchParams: Promise<{ period?: string }>;
}

export default async function AdminLegacyStoreDetailRedirect({
  params,
  searchParams,
}: AdminLegacyStoreDetailRedirectProps) {
  const { storeId } = await params;
  const { period } = await searchParams;
  const query = period ? `?period=${encodeURIComponent(period)}` : "";
  redirect(`/admin/dashboard/accounts/${storeId}${query}`);
}

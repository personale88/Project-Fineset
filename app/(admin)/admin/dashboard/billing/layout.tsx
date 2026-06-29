import { requireAdminBillingPageSession } from "@/lib/auth/require-admin-billing-page";

export default async function AdminBillingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminBillingPageSession();
  return children;
}

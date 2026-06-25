import { requirePortalSession } from "@/lib/auth/require-portal-session";

export default async function AdminSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePortalSession(["MASTER_ADMIN"]);
  return children;
}

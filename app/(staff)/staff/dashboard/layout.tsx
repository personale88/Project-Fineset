import { content } from "@/content/en";
import { PortalShell } from "@/components/layout/PortalShell";
import { RealtimeSyncProvider } from "@/components/layout/RealtimeSyncProvider";
import { RoleOnboardingModalGate } from "@/components/onboarding/RoleOnboardingModalGate";
import { GlobalSearchDialog } from "@/components/search/GlobalSearchDialog";
import { StaffBottomNav } from "@/components/staff/StaffBottomNav";
import { StaffNotificationBell } from "@/components/staff/StaffNotificationBell";
import { requirePortalSession } from "@/lib/auth/require-portal-session";
import { requireStaffContext } from "@/lib/auth/resolve-staff";
import { STAFF_DASHBOARD_PATH } from "@/lib/auth/routes";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Staff Dashboard",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requirePortalSession("STAFF");
  const staff = await requireStaffContext(session);

  return (
    <PortalShell
      title={content.staff.shell.title}
      homeHref={STAFF_DASHBOARD_PATH}
      signOutLabel={content.common.signOut}
      headerActions={
        <>
          <GlobalSearchDialog storeId={staff?.storeId} />
          <StaffNotificationBell />
        </>
      }
      bottomNav={<StaffBottomNav />}
    >
      <RealtimeSyncProvider>
        {children}
        <RoleOnboardingModalGate role="STAFF" userName={session.name} />
      </RealtimeSyncProvider>
    </PortalShell>
  );
}

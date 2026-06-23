import { RealtimeSyncProvider } from "@/components/layout/RealtimeSyncProvider";
import { RoleOnboardingModalGate } from "@/components/onboarding/RoleOnboardingModalGate";
import { StaffPortalShell } from "@/components/staff/StaffPortalShell";
import { requirePortalSession } from "@/lib/auth/require-portal-session";
import { requireStaffContext } from "@/lib/auth/resolve-staff";

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
    <StaffPortalShell storeId={staff?.storeId}>
      <RealtimeSyncProvider>
        {children}
        <RoleOnboardingModalGate role="STAFF" userName={session.name} />
      </RealtimeSyncProvider>
    </StaffPortalShell>
  );
}

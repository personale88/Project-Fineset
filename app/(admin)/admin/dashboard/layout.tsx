import { content } from "@/content/en";
import { AdminPortalExtras } from "@/components/admin/AdminPortalExtras";
import { AdminPortalHeaderActions } from "@/components/admin/AdminPortalHeaderActions";
import { PortalShell } from "@/components/layout/PortalShell";
import { RealtimeSyncProvider } from "@/components/layout/RealtimeSyncProvider";
import { RoleOnboardingModalGate } from "@/components/onboarding/RoleOnboardingModalGate";
import { getImpersonatedStoreIdFromCookie } from "@/lib/auth/impersonation";
import { requirePortalSession } from "@/lib/auth/require-portal-session";
import { prisma } from "@/lib/db/prisma";
import { storeNotDeletedWhere } from "@/lib/db/store-scope";
import { AdminPortalProvider } from "@/components/admin/AdminPortalContext";
import { BillingCycleSettingsProvider } from "@/components/admin/BillingCycleSettingsProvider";
import { PlatformSettingsProvider } from "@/components/admin/PlatformSettingsProvider";
import { getBillingCycleSettings } from "@/lib/automation/billing-cycle-settings";
import { getPlatformSettings } from "@/lib/services/platform-settings";
import type { AdminSession } from "@/types";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: content.admin.shell.title,
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requirePortalSession(["MASTER_ADMIN", "PLATFORM_ADMIN"]);
  const impersonatedStoreId = await getImpersonatedStoreIdFromCookie();

  let impersonatedStoreName: string | undefined;
  if (impersonatedStoreId) {
    const store = await prisma.store.findFirst({
      where: { ...storeNotDeletedWhere, id: impersonatedStoreId },
      select: { name: true },
    });
    impersonatedStoreName = store?.name;
  }

  const adminSession: AdminSession = {
    ...session,
    impersonatedStoreId: impersonatedStoreId ?? undefined,
  };

  const billingCycleSettings = await getBillingCycleSettings();
  const platformSettings = await getPlatformSettings();

  return (
    <PortalShell
      title={content.admin.shell.title}
      signOutLabel={content.common.signOut}
      headerActions={
        <AdminPortalHeaderActions
          search={content.admin.search}
          store={content.store}
          visitFields={content.visitForm.fields}
          productLabels={content.admin.categories}
        />
      }
    >
      <RealtimeSyncProvider>
        <AdminPortalProvider role={adminSession.role} permissions={adminSession.permissions}>
          <BillingCycleSettingsProvider settings={billingCycleSettings}>
            <PlatformSettingsProvider settings={platformSettings}>
              <AdminPortalExtras
              session={adminSession}
              impersonationCopy={content.admin.impersonation}
              impersonatedStoreName={impersonatedStoreName}
            >
              {children}
            </AdminPortalExtras>
            <RoleOnboardingModalGate role="MASTER_ADMIN" />
            </PlatformSettingsProvider>
          </BillingCycleSettingsProvider>
        </AdminPortalProvider>
      </RealtimeSyncProvider>
    </PortalShell>
  );
}

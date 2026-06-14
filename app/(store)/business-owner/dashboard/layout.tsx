import type { Metadata } from "next";
import { Suspense } from "react";
import { content } from "@/content/en";
import { RealtimeSyncProvider } from "@/components/layout/RealtimeSyncProvider";
import { RoleOnboardingModalGate } from "@/components/onboarding/RoleOnboardingModalGate";
import { StoreDashboardProvider } from "@/components/store/StoreDashboardProvider";
import { StoreDashboardShell } from "@/components/store/StoreDashboardShell";
import { requirePortalSession } from "@/lib/auth/require-portal-session";
import { listAccessibleStores } from "@/lib/services/manager-stores";

export const metadata: Metadata = {
  title: "Store Dashboard",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requirePortalSession(["BUSINESS_OWNER"]);
  const stores = await listAccessibleStores(session);
  const initialMyStores = {
    data: stores,
    selectedStoreId: session.storeId,
  };

  return (
    <Suspense fallback={null}>
      <StoreDashboardProvider
        portalRole={session.role}
        assignedStoreId={session.storeId}
        initialMyStores={initialMyStores}
      >
        <StoreDashboardShell
          title={content.store.shell.title}
          signOutLabel={content.common.signOut}
        >
          <RealtimeSyncProvider>
            {children}
            <RoleOnboardingModalGate role="BUSINESS_OWNER" />
          </RealtimeSyncProvider>
        </StoreDashboardShell>
      </StoreDashboardProvider>
    </Suspense>
  );
}

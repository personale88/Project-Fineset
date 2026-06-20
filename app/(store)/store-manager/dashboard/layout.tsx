import type { Metadata } from "next";
import { Suspense } from "react";
import { content } from "@/content/en";
import { RealtimeSyncProvider } from "@/components/layout/RealtimeSyncProvider";
import { RoleOnboardingModalGate } from "@/components/onboarding/RoleOnboardingModalGate";
import { ManagerActorProvider } from "@/components/store/ManagerActorProvider";
import { StoreDashboardProvider } from "@/components/store/StoreDashboardProvider";
import { StoreDashboardShell } from "@/components/store/StoreDashboardShell";
import { requirePortalActorContext } from "@/lib/auth/resolve-staff";
import { requirePortalSession } from "@/lib/auth/require-portal-session";

export const metadata: Metadata = {
  title: "Store Manager Portal",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function StoreManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requirePortalSession(["STORE_MANAGER"]);
  const actor = await requirePortalActorContext(session);

  return (
    <Suspense fallback={null}>
      <ManagerActorProvider staffLinked={Boolean(actor)}>
        <StoreDashboardProvider
          portalRole={session.role}
          assignedStoreId={session.storeId}
        >
          <StoreDashboardShell
            title={content.store.managerShell.title}
            signOutLabel={content.common.signOut}
            portalRole="STORE_MANAGER"
            storeId={session.storeId}
          >
            <RealtimeSyncProvider>
              {children}
              <RoleOnboardingModalGate role="STORE_MANAGER" />
            </RealtimeSyncProvider>
          </StoreDashboardShell>
        </StoreDashboardProvider>
      </ManagerActorProvider>
    </Suspense>
  );
}

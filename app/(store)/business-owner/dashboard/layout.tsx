import type { Metadata } from "next";
import { Suspense } from "react";
import { content } from "@/content/en";
import { RealtimeSyncProvider } from "@/components/layout/RealtimeSyncProvider";
import { RoleOnboardingModalGate } from "@/components/onboarding/RoleOnboardingModalGate";
import { BusinessOwnerPeriodProvider } from "@/components/store/BusinessOwnerPeriodProvider";
import { StoreDashboardProvider } from "@/components/store/StoreDashboardProvider";
import { StoreDashboardShell } from "@/components/store/StoreDashboardShell";
import { requirePortalSession } from "@/lib/auth/require-portal-session";
import { listAccessibleStores } from "@/lib/services/manager-stores";

export const metadata: Metadata = {
  title: "Business Owner",
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
        <BusinessOwnerPeriodProvider>
          <StoreDashboardShell
            portalType={content.store.ownerShell.title}
            signOutLabel={content.common.signOut}
            portalRole="BUSINESS_OWNER"
          >
            <RealtimeSyncProvider>
              {children}
              <RoleOnboardingModalGate role="BUSINESS_OWNER" />
            </RealtimeSyncProvider>
          </StoreDashboardShell>
        </BusinessOwnerPeriodProvider>
      </StoreDashboardProvider>
    </Suspense>
  );
}

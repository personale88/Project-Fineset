import { Suspense } from "react";
import { ManagerActorSetupBanner } from "@/components/store/ManagerActorSetupGate";
import { StoreManagerHomeQueues } from "@/components/store/StoreManagerHomeQueues";
import type { Content } from "@/content/en";

type StoreContent = Content["store"];

interface StoreManagerPortalProps {
  copy: StoreContent;
  storeId: string;
}

export function StoreManagerPortal({ copy, storeId }: StoreManagerPortalProps) {
  const dashboardCopy = copy.managerDashboard;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-bold text-text-primary sm:text-3xl">
          {dashboardCopy.title}
        </h1>
        <p className="text-text-secondary">{dashboardCopy.subtitle}</p>
      </header>

      <ManagerActorSetupBanner />

      <Suspense fallback={null}>
        <StoreManagerHomeQueues storeId={storeId} />
      </Suspense>
    </div>
  );
}

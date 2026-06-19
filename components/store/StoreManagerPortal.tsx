import { StoreCorrectionRequests } from "@/components/store/StoreCorrectionRequests";
import { StoreManagerActionCards } from "@/components/store/StoreManagerActionCards";
import { StoreManagerAssignmentOverview } from "@/components/store/StoreManagerAssignmentOverview";
import { ManagerActorSetupBanner, ManagerActorSetupGate } from "@/components/store/ManagerActorSetupGate";
import { StoreManagerPersonalWorkQueue } from "@/components/store/StoreManagerPersonalWorkQueue";
import { StoreManagerTeamActivity } from "@/components/store/StoreManagerTeamActivity";
import { StoreManagerTeamWorkload } from "@/components/store/StoreManagerTeamWorkload";
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
        <p className="mt-2 text-sm text-text-muted">{dashboardCopy.guide}</p>
      </header>

      <ManagerActorSetupBanner />

      <ManagerActorSetupGate requireLink>
        <StoreManagerPersonalWorkQueue storeId={storeId} />
      </ManagerActorSetupGate>

      <StoreManagerTeamWorkload storeId={storeId} />

      <StoreManagerTeamActivity storeId={storeId} />

      <StoreManagerActionCards copy={copy} storeId={storeId} />

      <StoreManagerAssignmentOverview storeId={storeId} />

      <StoreCorrectionRequests storeId={storeId} />
    </div>
  );
}

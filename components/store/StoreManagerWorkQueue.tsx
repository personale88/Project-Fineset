"use client";

import { content } from "@/content/en";
import { StaffWorkQueue } from "@/components/staff/StaffWorkQueue";
import { STORE_MANAGER_DASHBOARD_PATH } from "@/lib/auth/routes";

interface StoreManagerWorkQueueProps {
  storeId: string;
  variant: "personal" | "store";
}

export function StoreManagerWorkQueue({ storeId, variant }: StoreManagerWorkQueueProps) {
  const base = STORE_MANAGER_DASHBOARD_PATH;

  if (variant === "personal") {
    const copy = content.store.managerDashboard.personalWorkQueue;
    const staffCopy = content.staff.workQueue;
    return (
      <StaffWorkQueue
        portalBasePath={base}
        title={copy.title}
        subtitle={copy.subtitle}
        callsPath={`${base}/my-calls`}
        followUpsPath={`${base}/my-follow-ups`}
        browseVariant="store_manager_personal"
        browseStoreId={storeId}
        callFlowStoreId={storeId}
        viewTasksLabel={staffCopy.viewTasks}
        viewCallsLabel={staffCopy.viewCalls}
      />
    );
  }

  const copy = content.store.managerDashboard.storeWorkQueue;
  const staffCopy = content.staff.workQueue;
  const followUpsCopy = content.store.managerDashboard.followUps.store;

  return (
    <StaffWorkQueue
      dataSource="store"
      workQueueStoreId={storeId}
      workQueueLimit={30}
      portalBasePath={base}
      title={copy.title}
      subtitle={copy.subtitle}
      emptyMessage={copy.empty}
      previewHintTemplate={copy.previewHint}
      viewTasksLabel={staffCopy.viewTasks}
      viewCallsLabel={staffCopy.viewCalls}
      callsPath={`${base}/calls`}
      followUpsPath={`${base}/follow-ups`}
      browseVariant="store_manager"
      browseStoreId={storeId}
      callFlowStoreId={storeId}
      sectionLabelOverrides={{
        mismatched_assignment: followUpsCopy.filters.mismatched,
      }}
    />
  );
}

"use client";

import { content } from "@/content/en";
import { StaffWorkQueue } from "@/components/staff/StaffWorkQueue";
import { useBusinessOwnerPeriod } from "@/components/store/BusinessOwnerPeriodProvider";
import { useStoreDashboard } from "@/components/store/StoreDashboardProvider";
import { BUSINESS_OWNER_DASHBOARD_PATH } from "@/lib/auth/routes";
import { portalSectionPath } from "@/lib/utils/store-dashboard-url";
import { cn } from "@/lib/utils";

const WORK_QUEUE_LIMIT = 30;

export function BusinessOwnerWorkQueue() {
  const copy = content.store.ownerDashboard.workQueue;
  const staffCopy = content.staff.workQueue;
  const { period } = useBusinessOwnerPeriod();
  const {
    stores,
    portfolioWorkQueueStoreId,
    setPortfolioWorkQueueStoreId,
  } = useStoreDashboard();

  const browseStoreId = portfolioWorkQueueStoreId ?? stores[0]?.id;

  return (
    <StaffWorkQueue
      dataSource="store"
      workQueueStoreId={portfolioWorkQueueStoreId}
      workQueuePeriod={period}
      workQueueLimit={WORK_QUEUE_LIMIT}
      readOnly
      showStoreContext
      showStoreSummaries
      portalBasePath={BUSINESS_OWNER_DASHBOARD_PATH}
      title={copy.title}
      subtitle={copy.subtitle}
      emptyMessage={copy.empty}
      viewTasksLabel={staffCopy.viewTasks}
      viewCallsLabel={staffCopy.viewCalls}
      callsPath={portalSectionPath("calls", "BUSINESS_OWNER", portfolioWorkQueueStoreId)}
      followUpsPath={portalSectionPath(
        "follow-ups",
        "BUSINESS_OWNER",
        portfolioWorkQueueStoreId,
      )}
      browseVariant="business_owner"
      browseStoreId={browseStoreId}
      sectionLabelOverrides={{
        mismatched_assignment: copy.sections.mismatchedAssignment,
      }}
      headerExtra={
        stores.length > 1 ? (
          <div
            className="mt-4 flex flex-wrap gap-2"
            role="group"
            aria-label={copy.storeFilter.label}
          >
            <button
              type="button"
              aria-pressed={portfolioWorkQueueStoreId === null}
              onClick={() => setPortfolioWorkQueueStoreId(null)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                portfolioWorkQueueStoreId === null
                  ? "border-brand-gold bg-brand-gold/10 text-text-primary"
                  : "border-border text-text-muted hover:border-brand-gold/30",
              )}
            >
              {copy.storeFilter.allStores}
            </button>
            {stores.map((store) => (
              <button
                key={store.id}
                type="button"
                aria-pressed={portfolioWorkQueueStoreId === store.id}
                onClick={() => setPortfolioWorkQueueStoreId(store.id)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  portfolioWorkQueueStoreId === store.id
                    ? "border-brand-gold bg-brand-gold/10 text-text-primary"
                    : "border-border text-text-muted hover:border-brand-gold/30",
                )}
              >
                {store.name}
              </button>
            ))}
          </div>
        ) : null
      }
    />
  );
}

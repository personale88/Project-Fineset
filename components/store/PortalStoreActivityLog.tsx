"use client";

import { useQuery } from "@tanstack/react-query";
import { content } from "@/content/en";
import { useStoreDashboard } from "@/components/store/StoreDashboardProvider";
import { ProfileStoreFilter } from "@/components/store/profile/ProfileStoreFilter";
import { getStoreActivity } from "@/lib/api/store-activity";
import { formatDateTime } from "@/lib/utils/formatters";

interface PortalStoreActivityLogProps {
  portalRole: "STORE_MANAGER" | "BUSINESS_OWNER";
  embedded?: boolean;
}

export function PortalStoreActivityLog({
  portalRole,
  embedded = false,
}: PortalStoreActivityLogProps) {
  const copy =
    portalRole === "STORE_MANAGER"
      ? content.store.managerShell.activityLog
      : content.store.ownerShell.activityLog;
  const ownerActivityCopy = content.store.ownerShell.activityLog;
  const { storeId, stores, hasMultipleStores, setStoreId } = useStoreDashboard();
  const activeStoreId = storeId ?? stores[0]?.id;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["store-activity", portalRole, activeStoreId],
    queryFn: () => getStoreActivity(50, activeStoreId),
    enabled: Boolean(activeStoreId),
  });

  const rows = data ?? [];

  return (
    <div className={embedded ? "space-y-4" : "space-y-4"}>
      {portalRole === "BUSINESS_OWNER" && hasMultipleStores ? (
        <ProfileStoreFilter
          stores={stores}
          activeStoreId={activeStoreId ?? stores[0]!.id}
          onSelect={setStoreId}
          label={ownerActivityCopy.storeFilterLabel}
        />
      ) : null}

      {isLoading ? (
        <p className="text-sm text-text-secondary">{copy.loading}</p>
      ) : isError ? (
        <p className="text-sm text-status-error">{copy.error}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-text-secondary">{copy.empty}</p>
      ) : (
        <div className="overflow-x-auto rounded-card border border-border">
          <table className="min-w-full text-sm">
            <thead className="bg-surface-secondary text-left">
              <tr>
                <th className="px-4 py-2 font-medium text-text-secondary">{copy.columns.time}</th>
                <th className="px-4 py-2 font-medium text-text-secondary">{copy.columns.event}</th>
                <th className="px-4 py-2 font-medium text-text-secondary">{copy.columns.actor}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="px-4 py-2 text-text-muted">{formatDateTime(row.createdAt)}</td>
                  <td className="px-4 py-2 text-text-primary">{row.summary}</td>
                  <td className="px-4 py-2 text-text-secondary">{row.actorLabel ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {portalRole === "BUSINESS_OWNER" && activeStoreId ? (
        <p className="text-xs text-text-muted">
          {ownerActivityCopy.storeHint.replace(
            "{store}",
            stores.find((store) => store.id === activeStoreId)?.name ??
              ownerActivityCopy.storeFallback,
          )}
        </p>
      ) : null}
    </div>
  );
}

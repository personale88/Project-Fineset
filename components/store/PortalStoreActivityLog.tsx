"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { content } from "@/content/en";
import { useStoreDashboard } from "@/components/store/StoreDashboardProvider";
import { getStoreActivity } from "@/lib/api/store-activity";
import { formatDateTime } from "@/lib/utils/formatters";
import { cn } from "@/lib/utils";
import { BUSINESS_OWNER_DASHBOARD_PATH } from "@/lib/auth/routes";
import { storeManagerTeamHubHref } from "@/lib/utils/store-dashboard-url";

interface PortalStoreActivityLogProps {
  portalRole: "STORE_MANAGER" | "BUSINESS_OWNER";
}

export function PortalStoreActivityLog({ portalRole }: PortalStoreActivityLogProps) {
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
  const backHref =
    portalRole === "STORE_MANAGER"
      ? storeManagerTeamHubHref()
      : BUSINESS_OWNER_DASHBOARD_PATH;

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary transition-colors hover:text-brand-gold"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {content.common.back}
        </Link>
        <div>
          <h1 className="font-display text-2xl font-bold text-text-primary">{copy.title}</h1>
          <p className="mt-1 text-sm text-text-secondary">{copy.subtitle}</p>
        </div>
      </div>

      {portalRole === "BUSINESS_OWNER" && hasMultipleStores ? (
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label={ownerActivityCopy.storeFilterLabel}
        >
          {stores.map((store) => (
            <button
              key={store.id}
              type="button"
              aria-pressed={activeStoreId === store.id}
              onClick={() => setStoreId(store.id)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                activeStoreId === store.id
                  ? "border-brand-gold bg-brand-gold/10 text-text-primary"
                  : "border-border text-text-muted hover:border-brand-gold/30",
              )}
            >
              {store.name}
            </button>
          ))}
        </div>
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
            stores.find((store) => store.id === activeStoreId)?.name ?? ownerActivityCopy.storeFallback,
          )}
        </p>
      ) : null}
    </div>
  );
}

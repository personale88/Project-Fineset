"use client";

import Link from "next/link";
import { content } from "@/content/en";
import { useManagerDashboard } from "@/hooks/useManagerDashboard";
import { STORE_MANAGER_DASHBOARD_PATH } from "@/lib/auth/routes";
import { buildTeamCallsHref } from "@/lib/utils/staff-calls-url";
import { buildFollowUpsHref } from "@/lib/utils/follow-ups-url";
import { getPortalErrorMessage } from "@/lib/utils/api-error-message";
import { QueryLoadState } from "@/components/shared/QueryLoadState";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function StoreManagerTeamWorkload({ storeId }: { storeId: string }) {
  const copy = content.store.managerDashboard.teamWorkload;
  const { data, isLoading, isError, error, refetch } = useManagerDashboard(storeId);

  const rows = (data?.staffActivity ?? []).filter(
    (row) => row.isActive && (row.overdueTasks > 0 || row.dueTodayTasks > 0 || row.pendingWork > 0),
  );

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-lg">{copy.title}</CardTitle>
        <CardDescription>{copy.subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <QueryLoadState
          isLoading={isLoading}
          isError={isError}
          errorLabel={getPortalErrorMessage(error, content.errors)}
          retryLabel={content.errors.tryAgain}
          onRetry={() => void refetch()}
        >
          {!rows.length ? (
            <p className="text-sm text-text-secondary">{copy.empty}</p>
          ) : (
            <ul className="space-y-2">
              {rows.map((row) => (
                <li
                  key={row.staffId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-border px-3 py-2.5"
                >
                  <div>
                    <p className="font-medium text-text-primary">{row.staffName}</p>
                    <p className="text-xs text-text-muted">
                      {copy.pending.replace("{count}", String(row.pendingWork))}
                      {row.overdueTasks > 0
                        ? ` · ${copy.overdue.replace("{count}", String(row.overdueTasks))}`
                        : ""}
                      {row.dueTodayTasks > 0
                        ? ` · ${copy.dueToday.replace("{count}", String(row.dueTodayTasks))}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex gap-3 text-sm">
                    <Link
                      href={buildTeamCallsHref(
                        `${STORE_MANAGER_DASHBOARD_PATH}/calls`,
                        row.staffId,
                      )}
                      className="font-medium text-brand-gold hover:underline"
                    >
                      {copy.viewCalls}
                    </Link>
                    <Link
                      href={buildFollowUpsHref(
                        `${STORE_MANAGER_DASHBOARD_PATH}/follow-ups`,
                        "open",
                      )}
                      className="font-medium text-brand-gold hover:underline"
                    >
                      {copy.viewFollowUps}
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </QueryLoadState>
      </CardContent>
    </Card>
  );
}

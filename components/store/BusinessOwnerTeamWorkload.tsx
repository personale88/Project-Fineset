"use client";

import Link from "next/link";
import { content } from "@/content/en";
import { useBusinessOwnerPeriod } from "@/components/store/BusinessOwnerPeriodProvider";
import { useOwnerDashboard } from "@/hooks/useOwnerDashboard";
import { getPortalErrorMessage } from "@/lib/utils/api-error-message";
import { buildFollowUpsHref } from "@/lib/utils/follow-ups-url";
import { buildTeamCallsHref } from "@/lib/utils/staff-calls-url";
import { portalSectionPath } from "@/lib/utils/store-dashboard-url";
import { QueryLoadState } from "@/components/shared/QueryLoadState";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function BusinessOwnerTeamWorkload() {
  const copy = content.store.ownerDashboard.teamWorkload;
  const { period } = useBusinessOwnerPeriod();
  const { data, isLoading, isError, error, refetch } = useOwnerDashboard(period);

  const rows = (data?.staffActivity ?? []).filter(
    (row) =>
      row.isActive &&
      (row.overdueTasks > 0 || row.dueTodayTasks > 0 || row.pendingWork > 0),
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
              {rows.slice(0, 8).map((row) => {
                const callsBase = portalSectionPath("calls", "BUSINESS_OWNER", row.storeId);
                const followUpsBase = portalSectionPath(
                  "follow-ups",
                  "BUSINESS_OWNER",
                  row.storeId,
                );

                return (
                  <li
                    key={`${row.storeId}-${row.staffId}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-border px-3 py-2.5"
                  >
                    <div>
                      <p className="font-medium text-text-primary">
                        {row.staffName}
                        <span className="ml-2 text-xs font-normal text-text-muted">
                          {row.storeName}
                        </span>
                      </p>
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
                        href={buildTeamCallsHref(callsBase, row.staffId)}
                        className="font-medium text-brand-gold hover:underline"
                      >
                        {copy.viewCalls}
                      </Link>
                      <Link
                        href={buildFollowUpsHref(followUpsBase, "open")}
                        className="font-medium text-brand-gold hover:underline"
                      >
                        {copy.viewFollowUps}
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </QueryLoadState>
      </CardContent>
    </Card>
  );
}

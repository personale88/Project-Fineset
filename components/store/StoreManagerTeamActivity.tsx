"use client";

import Link from "next/link";
import { AlertCircle, ChevronRight } from "lucide-react";
import { content } from "@/content/en";
import { useManagerDashboard } from "@/hooks/useManagerDashboard";
import { STORE_MANAGER_DASHBOARD_PATH } from "@/lib/auth/routes";
import { buildTeamCallsHref } from "@/lib/utils/staff-calls-url";
import { buildTeamFollowUpsHref } from "@/lib/utils/follow-ups-url";
import { getPortalErrorMessage } from "@/lib/utils/api-error-message";
import { QueryLoadState } from "@/components/shared/QueryLoadState";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface StoreManagerTeamActivityProps {
  storeId: string;
}

function staffCallsHref(staffId: string): string {
  return buildTeamCallsHref(`${STORE_MANAGER_DASHBOARD_PATH}/calls`, staffId);
}

function staffFollowUpsHref(staffId: string): string {
  return buildTeamFollowUpsHref(`${STORE_MANAGER_DASHBOARD_PATH}/follow-ups`, staffId, "open");
}

export function StoreManagerTeamActivity({ storeId }: StoreManagerTeamActivityProps) {
  const copy = content.store.managerDashboard.teamActivity;
  const { data, isLoading, isError, error, refetch } = useManagerDashboard(storeId);

  const rows = (data?.staffActivity ?? []).filter((row) => row.isActive);

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-lg">{copy.title}</CardTitle>
          <CardDescription>{copy.subtitle}</CardDescription>
        </div>
        <Link
          href={`${STORE_MANAGER_DASHBOARD_PATH}/staff`}
          className="inline-flex items-center gap-1 text-sm font-medium text-brand-gold hover:underline"
        >
          {copy.viewStaff}
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
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
            <div className="overflow-x-auto rounded-card border border-border">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="border-b border-border bg-surface-secondary">
                  <tr>
                    <th className="px-4 py-3 font-medium text-text-secondary">{copy.columns.staff}</th>
                    <th className="px-4 py-3 font-medium text-text-secondary">{copy.columns.visits}</th>
                    <th className="px-4 py-3 font-medium text-text-secondary">{copy.columns.conversion}</th>
                    <th className="px-4 py-3 font-medium text-text-secondary">{copy.columns.openFollowUps}</th>
                    <th className="px-4 py-3 font-medium text-text-secondary">{copy.columns.pendingWork}</th>
                    <th className="px-4 py-3 font-medium text-text-secondary">{copy.columns.status}</th>
                    <th className="px-4 py-3 font-medium text-text-secondary">{copy.columns.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const needsAttention = row.overdueTasks > 0 || row.pendingWork > 0;
                    return (
                      <tr key={row.staffId} className="border-b border-border last:border-0">
                        <td className="px-4 py-3 font-medium text-text-primary">
                          {row.staffName}
                          {row.role === "STORE_MANAGER" ? (
                            <span className="ml-2 text-xs text-text-muted">(Manager)</span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 font-numeric tabular-nums">{row.monthlyVisits}</td>
                        <td className="px-4 py-3 font-numeric tabular-nums">{row.conversionRate}%</td>
                        <td className="px-4 py-3 font-numeric tabular-nums">{row.openFollowUps}</td>
                        <td className="px-4 py-3">
                          <span className="font-numeric tabular-nums text-text-primary">
                            {row.pendingWork}
                          </span>
                          {row.overdueTasks > 0 ? (
                            <span className="ml-2 text-xs text-status-error">
                              {copy.overdueHint.replace("{count}", String(row.overdueTasks))}
                            </span>
                          ) : row.dueTodayTasks > 0 ? (
                            <span className="ml-2 text-xs text-status-warning">
                              {copy.dueTodayHint.replace("{count}", String(row.dueTodayTasks))}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          {needsAttention ? (
                            <Badge variant="warning" className="gap-1">
                              <AlertCircle className="h-3 w-3" aria-hidden />
                              {copy.statusNeedsAttention}
                            </Badge>
                          ) : (
                            <Badge variant="success">{copy.statusOnTrack}</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-3">
                            <Link
                              href={staffCallsHref(row.staffId)}
                              className="text-sm font-medium text-brand-gold hover:underline"
                            >
                              {copy.viewCalls}
                            </Link>
                            <Link
                              href={staffFollowUpsHref(row.staffId)}
                              className="text-sm font-medium text-brand-gold hover:underline"
                            >
                              {copy.viewFollowUps}
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </QueryLoadState>
      </CardContent>
    </Card>
  );
}

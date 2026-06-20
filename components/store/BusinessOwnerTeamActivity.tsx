"use client";

import Link from "next/link";
import { AlertCircle, ChevronRight } from "lucide-react";
import { content } from "@/content/en";
import { useBusinessOwnerPeriod } from "@/components/store/BusinessOwnerPeriodProvider";
import { useOwnerDashboard } from "@/hooks/useOwnerDashboard";
import { getPortalErrorMessage } from "@/lib/utils/api-error-message";
import { buildFollowUpsHref } from "@/lib/utils/follow-ups-url";
import { buildTeamCallsHref } from "@/lib/utils/staff-calls-url";
import { portalSectionPath } from "@/lib/utils/store-dashboard-url";
import { QueryLoadState } from "@/components/shared/QueryLoadState";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function BusinessOwnerTeamActivity() {
  const copy = content.store.ownerDashboard.teamActivity;
  const { period } = useBusinessOwnerPeriod();
  const { data, isLoading, isError, error, refetch } = useOwnerDashboard(period);
  const rows = (data?.staffActivity ?? []).filter((row) => row.isActive);

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-lg">{copy.title}</CardTitle>
          <CardDescription>{copy.subtitle}</CardDescription>
        </div>
        <Link
          href={portalSectionPath("staff", "BUSINESS_OWNER")}
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
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="border-b border-border bg-surface-secondary">
                  <tr>
                    <th className="px-4 py-3 font-medium text-text-secondary">
                      {copy.columns.store}
                    </th>
                    <th className="px-4 py-3 font-medium text-text-secondary">
                      {copy.columns.staff}
                    </th>
                    <th className="px-4 py-3 font-medium text-text-secondary">
                      {copy.columns.visits}
                    </th>
                    <th className="px-4 py-3 font-medium text-text-secondary">
                      {copy.columns.conversion}
                    </th>
                    <th className="px-4 py-3 font-medium text-text-secondary">
                      {copy.columns.openFollowUps}
                    </th>
                    <th className="px-4 py-3 font-medium text-text-secondary">
                      {copy.columns.pendingWork}
                    </th>
                    <th className="px-4 py-3 font-medium text-text-secondary">
                      {copy.columns.status}
                    </th>
                    <th className="px-4 py-3 font-medium text-text-secondary">
                      {copy.columns.actions}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const needsAttention = row.overdueTasks > 0 || row.pendingWork > 0;
                    const callsBase = portalSectionPath("calls", "BUSINESS_OWNER", row.storeId);
                    const followUpsBase = portalSectionPath(
                      "follow-ups",
                      "BUSINESS_OWNER",
                      row.storeId,
                    );

                    return (
                      <tr
                        key={`${row.storeId}-${row.staffId}`}
                        className="border-b border-border last:border-0"
                      >
                        <td className="px-4 py-3 text-text-secondary">{row.storeName}</td>
                        <td className="px-4 py-3 font-medium text-text-primary">
                          {row.staffName}
                          {row.role === "STORE_MANAGER" ? (
                            <span className="ml-2 text-xs text-text-muted">(Manager)</span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 font-numeric tabular-nums">{row.monthlyVisits}</td>
                        <td className="px-4 py-3 font-numeric tabular-nums">
                          {row.conversionRate}%
                        </td>
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
                              href={buildTeamCallsHref(callsBase, row.staffId)}
                              className="text-sm font-medium text-brand-gold hover:underline"
                            >
                              {copy.viewCalls}
                            </Link>
                            <Link
                              href={buildFollowUpsHref(followUpsBase, "open")}
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

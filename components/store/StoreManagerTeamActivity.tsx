"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { content } from "@/content/en";
import { TeamActivityViews } from "@/components/store/TeamActivityViews";
import { useManagerDashboard } from "@/hooks/useManagerDashboard";
import { STORE_MANAGER_DASHBOARD_PATH } from "@/lib/auth/routes";
import { buildTeamCallsHref } from "@/lib/utils/staff-calls-url";
import { buildTeamFollowUpsHref } from "@/lib/utils/follow-ups-url";
import { getPortalErrorMessage } from "@/lib/utils/api-error-message";
import { QueryLoadState } from "@/components/shared/QueryLoadState";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface StoreManagerTeamActivityProps {
  storeId: string;
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
            <TeamActivityViews
              rows={rows}
              copy={copy}
              showStoreColumn={false}
              getCallsHref={(row) =>
                buildTeamCallsHref(`${STORE_MANAGER_DASHBOARD_PATH}/calls`, row.staffId)
              }
              getFollowUpsHref={(row) =>
                buildTeamFollowUpsHref(
                  `${STORE_MANAGER_DASHBOARD_PATH}/follow-ups`,
                  row.staffId,
                  "open",
                )
              }
            />
          )}
        </QueryLoadState>
      </CardContent>
    </Card>
  );
}

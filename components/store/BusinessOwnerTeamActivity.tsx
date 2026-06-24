"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { content } from "@/content/en";
import { useBusinessOwnerPeriod } from "@/components/store/BusinessOwnerPeriodProvider";
import { TeamActivityViews } from "@/components/store/TeamActivityViews";
import { useOwnerDashboard } from "@/hooks/useOwnerDashboard";
import { getPortalErrorMessage } from "@/lib/utils/api-error-message";
import { buildFollowUpsHref } from "@/lib/utils/follow-ups-url";
import { buildTeamCallsHref } from "@/lib/utils/staff-calls-url";
import { portalProfileSectionPath, portalSectionPath } from "@/lib/utils/store-dashboard-url";
import { QueryLoadState } from "@/components/shared/QueryLoadState";
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
          href={portalProfileSectionPath("BUSINESS_OWNER", "staff")}
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
              showStoreColumn
              getCallsHref={(row) =>
                buildTeamCallsHref(
                  portalSectionPath("calls", "BUSINESS_OWNER", row.storeId),
                  row.staffId,
                )
              }
              getFollowUpsHref={(row) =>
                buildFollowUpsHref(
                  portalSectionPath("follow-ups", "BUSINESS_OWNER", row.storeId),
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

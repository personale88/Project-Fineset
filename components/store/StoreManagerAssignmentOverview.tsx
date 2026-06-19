"use client";

import Link from "next/link";
import { AlertTriangle, ClipboardList, UserCheck, Users } from "lucide-react";
import { content } from "@/content/en";
import { useManagerDashboard } from "@/hooks/useManagerDashboard";
import { STORE_MANAGER_DASHBOARD_PATH } from "@/lib/auth/routes";
import { getPortalErrorMessage } from "@/lib/utils/api-error-message";
import { QueryLoadState } from "@/components/shared/QueryLoadState";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface StoreManagerAssignmentOverviewProps {
  storeId: string;
}

export function StoreManagerAssignmentOverview({
  storeId,
}: StoreManagerAssignmentOverviewProps) {
  const copy = content.store.managerDashboard.assignment;
  const { data, isLoading, isError, error, refetch } = useManagerDashboard(storeId);

  const cards = data
    ? [
        {
          key: "customers",
          label: copy.customersWithOpenWork,
          hint: copy.customersWithOpenWorkHint,
          value: data.assignment.customersWithOpenWork,
          icon: UserCheck,
          href: `${STORE_MANAGER_DASHBOARD_PATH}/follow-ups?filter=open`,
          tone: "default" as const,
        },
        {
          key: "followUps",
          label: copy.openFollowUps,
          hint: copy.openFollowUpsHint,
          value: data.assignment.openFollowUps,
          icon: ClipboardList,
          href: `${STORE_MANAGER_DASHBOARD_PATH}/follow-ups?filter=open`,
          tone: "default" as const,
        },
        {
          key: "mismatched",
          label: copy.mismatchedAssignments,
          hint: copy.mismatchedAssignmentsHint,
          value: data.assignment.mismatchedAssignments,
          icon: AlertTriangle,
          href: `${STORE_MANAGER_DASHBOARD_PATH}/follow-ups?filter=mismatched`,
          tone: data.assignment.mismatchedAssignments > 0 ? ("warning" as const) : ("default" as const),
        },
        {
          key: "staff",
          label: copy.activeStaff,
          hint: copy.activeStaffHint,
          value: data.assignment.activeStaff,
          icon: Users,
          href: `${STORE_MANAGER_DASHBOARD_PATH}/staff`,
          tone: "default" as const,
        },
      ]
    : [];

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
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((card) => {
              const Icon = card.icon;
              return (
                <Link
                  key={card.key}
                  href={card.href}
                  title={card.hint}
                  className="group rounded-card border border-border bg-surface-card p-4 transition-colors hover:border-brand-gold/30 hover:bg-brand-gold/[0.03]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                        {card.label}
                      </p>
                      <p
                        className={
                          card.tone === "warning"
                            ? "mt-1 font-numeric text-2xl font-bold tabular-nums text-status-warning"
                            : "mt-1 font-numeric text-2xl font-bold tabular-nums text-text-primary"
                        }
                      >
                        {card.value}
                      </p>
                      <p className="mt-1 text-xs text-text-muted">{card.hint}</p>
                    </div>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-gold/10 text-brand-gold">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </QueryLoadState>
      </CardContent>
    </Card>
  );
}

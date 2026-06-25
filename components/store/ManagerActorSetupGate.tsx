"use client";

import Link from "next/link";
import { AlertTriangle, Users } from "lucide-react";
import { content } from "@/content/en";
import { useManagerActor } from "@/components/store/ManagerActorProvider";
import { STORE_MANAGER_DASHBOARD_PATH } from "@/lib/auth/routes";
import { portalProfileSectionPath } from "@/lib/utils/store-dashboard-url";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ManagerActorSetupGateProps {
  children: React.ReactNode;
  /** When true, block children if staff is not linked (personal RSO flows). */
  requireLink?: boolean;
}

export function ManagerActorSetupGate({
  children,
  requireLink = false,
}: ManagerActorSetupGateProps) {
  const { staffLinked } = useManagerActor();
  const copy = content.store.managerShell.actorSetup;

  if (!requireLink || staffLinked) {
    return <>{children}</>;
  }

  return (
    <Card className="border-status-warning/40 bg-status-warning/5">
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 shrink-0 text-status-warning" aria-hidden />
          <CardTitle className="text-lg">{copy.title}</CardTitle>
        </div>
        <CardDescription>{copy.subtitle}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-text-secondary">
        <p>{copy.body}</p>
        <div className="rounded-card border border-border bg-surface-primary/60 p-4">
          <p className="flex items-center gap-2 font-medium text-text-primary">
            <Users className="h-4 w-4" aria-hidden />
            {copy.contactOwner}
          </p>
          <p className="mt-1 text-text-muted">{copy.stepsTitle}</p>
          <ol className="mt-2 list-decimal space-y-2 pl-5">
            {copy.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
        <p className="text-text-muted">{copy.hint}</p>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link href={portalProfileSectionPath("STORE_MANAGER", "staff")}>
              {copy.viewStaffRoster}
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`${STORE_MANAGER_DASHBOARD_PATH}/team`}>{copy.openTeamHub}</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function ManagerActorSetupBanner() {
  const { staffLinked } = useManagerActor();
  const copy = content.store.managerShell.actorSetup;

  if (staffLinked) return null;

  return (
    <div
      role="status"
      className="rounded-card border border-status-warning/40 bg-status-warning/5 px-4 py-3 text-sm text-text-secondary"
    >
      <p className="font-medium text-text-primary">{copy.title}</p>
      <p className="mt-1">{copy.dashboardHint}</p>
      <Link
        href={portalProfileSectionPath("STORE_MANAGER", "staff")}
        className="mt-2 inline-block text-sm font-medium text-brand-gold hover:underline"
      >
        {copy.viewStaffRoster}
      </Link>
    </div>
  );
}

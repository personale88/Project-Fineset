"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { content } from "@/content/en";
import { useManagerActor } from "@/components/store/ManagerActorProvider";
import { STORE_MANAGER_DASHBOARD_PATH } from "@/lib/auth/routes";
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
          <AlertTriangle className="h-5 w-5 text-status-warning" aria-hidden />
          <CardTitle className="text-lg">{copy.title}</CardTitle>
        </div>
        <CardDescription>{copy.subtitle}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-text-secondary">
        <p>{copy.body}</p>
        <div>
          <p className="font-medium text-text-primary">{copy.stepsTitle}</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-text-secondary">
            {copy.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
        <p className="text-text-muted">{copy.hint}</p>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`${STORE_MANAGER_DASHBOARD_PATH}/staff`}>{copy.viewStaffRoster}</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href={`${STORE_MANAGER_DASHBOARD_PATH}/team`}>Open Team hub</Link>
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
        href={`${STORE_MANAGER_DASHBOARD_PATH}/staff`}
        className="mt-2 inline-block text-sm font-medium text-brand-gold hover:underline"
      >
        {copy.viewStaffRoster}
      </Link>
    </div>
  );
}

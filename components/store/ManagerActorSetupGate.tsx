"use client";

import { AlertTriangle } from "lucide-react";
import { content } from "@/content/en";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useManagerActor } from "@/components/store/ManagerActorProvider";

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
      <CardContent className="space-y-2 text-sm text-text-secondary">
        <p>{copy.body}</p>
        <p className="text-text-muted">{copy.hint}</p>
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
    </div>
  );
}

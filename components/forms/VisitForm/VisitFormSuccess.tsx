"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface VisitFormSuccessAction {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface VisitFormSuccessProps {
  title: string;
  message: string;
  logAnotherLabel: string;
  onLogAnother: () => void;
  secondaryActions?: VisitFormSuccessAction[];
}

export function VisitFormSuccess({
  title,
  message,
  logAnotherLabel,
  onLogAnother,
  secondaryActions = [],
}: VisitFormSuccessProps) {
  return (
    <Card className="border-status-success/30">
      <CardHeader className="items-center text-center">
        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-status-success/10">
          <CheckCircle2 className="h-6 w-6 text-status-success" />
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {secondaryActions.map((action) =>
          action.href ? (
            <Button key={action.label} asChild variant="outline" className="w-full">
              <Link href={action.href}>{action.label}</Link>
            </Button>
          ) : (
            <Button
              key={action.label}
              type="button"
              variant="outline"
              className="w-full"
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          ),
        )}
        <Button className="w-full" onClick={onLogAnother}>
          {logAnotherLabel}
        </Button>
      </CardContent>
    </Card>
  );
}

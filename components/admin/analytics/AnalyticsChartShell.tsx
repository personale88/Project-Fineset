"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CHART_CARD_CLASS,
  CHART_CARD_CONTENT_CLASS,
  CHART_CARD_HEADER_CLASS,
} from "@/lib/utils/chart-layout";
import { cn } from "@/lib/utils";

interface AnalyticsChartShellProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function AnalyticsChartShell({
  title,
  description,
  children,
  className,
}: AnalyticsChartShellProps) {
  return (
    <Card className={cn(CHART_CARD_CLASS, className)}>
      <CardHeader className={CHART_CARD_HEADER_CLASS}>
        <CardTitle className="text-base font-semibold text-text-primary">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className={CHART_CARD_CONTENT_CLASS}>{children}</CardContent>
    </Card>
  );
}

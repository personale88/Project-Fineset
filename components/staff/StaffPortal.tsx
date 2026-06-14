import Link from "next/link";
import { ClipboardList, MapPin, Phone, CalendarClock } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DashboardNotifications } from "@/components/dashboard/DashboardNotifications";
import { STAFF_DASHBOARD_PATH } from "@/lib/auth/routes";
import type { Content } from "@/content/en";

type StaffContent = Content["staff"];

interface StaffPortalProps {
  copy: StaffContent;
}

const actionIcons = {
  logVisit: ClipboardList,
  callUsers: Phone,
  fieldSales: MapPin,
  followUps: CalendarClock,
} as const;

export function StaffPortal({ copy }: StaffPortalProps) {
  const actions = [
    {
      key: "logVisit" as const,
      href: `${STAFF_DASHBOARD_PATH}/visits`,
      ...copy.portal.actions.logVisit,
    },
    {
      key: "callUsers" as const,
      href: `${STAFF_DASHBOARD_PATH}/calls`,
      ...copy.portal.actions.callUsers,
    },
    {
      key: "fieldSales" as const,
      href: `${STAFF_DASHBOARD_PATH}/field-sales`,
      ...copy.portal.actions.fieldSales,
    },
    {
      key: "followUps" as const,
      href: `${STAFF_DASHBOARD_PATH}/follow-ups`,
      ...copy.portal.actions.followUps,
    },
  ];

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-bold text-text-primary sm:text-3xl">
          {copy.portal.title}
        </h1>
        <p className="text-text-secondary">{copy.portal.subtitle}</p>
      </header>

      <DashboardNotifications variant="staff" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {actions.map((action) => {
          const Icon = actionIcons[action.key];

          return (
            <Link key={action.key} href={action.href} className="group block h-full">
              <Card className="flex h-full flex-col transition-shadow hover:shadow-lg group-focus-visible:ring-2 group-focus-visible:ring-brand-gold group-focus-visible:ring-offset-2">
                <CardHeader className="space-y-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-card bg-brand-gold/10 text-brand-gold">
                    <Icon className="h-6 w-6" aria-hidden />
                  </div>
                  <div className="space-y-1.5">
                    <CardTitle className="text-xl">{action.title}</CardTitle>
                    <CardDescription>{action.description}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="mt-auto">
                  <Button className="w-full" tabIndex={-1}>
                    {action.cta}
                  </Button>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

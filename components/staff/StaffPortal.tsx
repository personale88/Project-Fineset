import { DashboardNotifications } from "@/components/dashboard/DashboardNotifications";
import { StaffPortalActionCards } from "@/components/staff/StaffPortalActionCards";
import { StaffWorkQueue } from "@/components/staff/StaffWorkQueue";
import type { Content } from "@/content/en";

type StaffContent = Content["staff"];

interface StaffPortalProps {
  copy: StaffContent;
}

export function StaffPortal({ copy }: StaffPortalProps) {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-bold text-text-primary sm:text-3xl">
          {copy.portal.title}
        </h1>
        <p className="text-text-secondary">{copy.portal.subtitle}</p>
        <p className="mt-2 text-sm text-text-muted">{copy.portal.remindersGuide}</p>
      </header>

      <StaffWorkQueue />

      <DashboardNotifications variant="staff" />

      <StaffPortalActionCards copy={copy} />
    </div>
  );
}

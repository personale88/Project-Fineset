import { content } from "@/content/en";
import { STAFF_DASHBOARD_PATH } from "@/lib/auth/routes";

export function buildStaffDesktopNav() {
  const nav = content.staff.shell.nav;
  return [
    { href: STAFF_DASHBOARD_PATH, label: nav.home },
    { href: `${STAFF_DASHBOARD_PATH}/calls`, label: nav.calls },
    { href: `${STAFF_DASHBOARD_PATH}/follow-ups`, label: nav.followUps },
    { href: `${STAFF_DASHBOARD_PATH}/log-visit`, label: nav.logVisit },
  ];
}

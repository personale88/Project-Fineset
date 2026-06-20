import { content } from "@/content/en";
import { BUSINESS_OWNER_DASHBOARD_PATH } from "@/lib/auth/routes";
import { portalSectionPath } from "@/lib/utils/store-dashboard-url";

export function buildOwnerDesktopNav(storeId?: string | null) {
  const nav = content.store.ownerShell.nav;
  return [
    { href: BUSINESS_OWNER_DASHBOARD_PATH, label: nav.home },
    { href: portalSectionPath("calls", "BUSINESS_OWNER", storeId), label: nav.calls },
    { href: portalSectionPath("follow-ups", "BUSINESS_OWNER", storeId), label: nav.followUps },
    { href: portalSectionPath("staff", "BUSINESS_OWNER", storeId), label: nav.staff },
    { href: portalSectionPath("audit", "BUSINESS_OWNER"), label: nav.activity },
  ];
}

import { content } from "@/content/en";
import { STORE_MANAGER_DASHBOARD_PATH } from "@/lib/auth/routes";
import {
  storeManagerDetailPath,
  storeManagerHomeHubHref,
} from "@/lib/utils/store-dashboard-url";

export function buildManagerDesktopNav(storeId: string) {
  const nav = content.store.managerShell.nav;
  const bottomNav = content.store.managerShell.bottomNav;

  return [
    { href: STORE_MANAGER_DASHBOARD_PATH, label: nav.home },
    { href: storeManagerHomeHubHref("my-work"), label: bottomNav.myWork },
    { href: storeManagerHomeHubHref("team"), label: bottomNav.team },
    { href: storeManagerDetailPath(storeId), label: nav.analytics },
  ];
}

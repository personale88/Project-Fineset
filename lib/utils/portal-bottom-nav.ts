import {
  STAFF_DASHBOARD_PATH,
  STORE_MANAGER_DASHBOARD_PATH,
} from "@/lib/auth/routes";

const HIDE_BOTTOM_NAV_PREFIXES = [
  `${STAFF_DASHBOARD_PATH}/log-visit`,
  `${STAFF_DASHBOARD_PATH}/field-sales`,
  `${STORE_MANAGER_DASHBOARD_PATH}/log-visit`,
  `${STORE_MANAGER_DASHBOARD_PATH}/log-field-sale`,
] as const;

export function shouldHidePortalBottomNav(pathname: string): boolean {
  return HIDE_BOTTOM_NAV_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

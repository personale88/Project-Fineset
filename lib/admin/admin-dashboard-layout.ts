/** Admin dashboard routes that show a docked child side panel beside the primary nav. */
export const ADMIN_CHILD_PANEL_ROUTE_PREFIXES = [
  "/admin/dashboard/settings",
  "/admin/dashboard/accounts",
  "/admin/dashboard/stores",
  "/admin/dashboard/automation",
  "/admin/dashboard/analytics",
] as const;

/** Exact paths where a docked child side panel is mounted (not store detail sub-routes). */
const DOCKED_CHILD_PANEL_PATHS = new Set<string>(ADMIN_CHILD_PANEL_ROUTE_PREFIXES);

export function adminRouteHasChildPanel(pathname: string): boolean {
  return DOCKED_CHILD_PANEL_PATHS.has(pathname);
}

/** Routes that lock outer scroll and scroll inside the scoped content card. */
export function adminRouteUsesScopedPageScroll(pathname: string): boolean {
  return (
    pathname === "/admin/dashboard/settings" ||
    pathname === "/admin/dashboard/accounts" ||
    pathname === "/admin/dashboard/automation"
  );
}

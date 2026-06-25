import type { AppSession, UserRole } from "@/types";

export const STAFF_DASHBOARD_PATH = "/staff/dashboard";
export const STORE_MANAGER_DASHBOARD_PATH = "/store-manager/dashboard";
export const BUSINESS_OWNER_DASHBOARD_PATH = "/business-owner/dashboard";
export const BUSINESS_OWNER_PROFILE_PATH = `${BUSINESS_OWNER_DASHBOARD_PATH}/profile`;
export const STORE_MANAGER_PROFILE_PATH = `${STORE_MANAGER_DASHBOARD_PATH}/profile`;
export const ADMIN_DASHBOARD_PATH = "/admin/dashboard";

/** @deprecated Legacy prefix — remapped per role in proxy and post-auth redirects. */
export const LEGACY_STORE_DASHBOARD_PATH = "/store/dashboard";

export const PROTECTED_PORTAL_ROUTES: ReadonlyArray<{
  prefix: string;
  roles: readonly UserRole[];
}> = [
  { prefix: STAFF_DASHBOARD_PATH, roles: ["STAFF"] },
  { prefix: STORE_MANAGER_DASHBOARD_PATH, roles: ["STORE_MANAGER"] },
  { prefix: BUSINESS_OWNER_DASHBOARD_PATH, roles: ["BUSINESS_OWNER"] },
  { prefix: ADMIN_DASHBOARD_PATH, roles: ["MASTER_ADMIN", "PLATFORM_ADMIN"] },
];

export const PROTECTED_API_ROUTES: ReadonlyArray<{
  prefix: string;
  roles: readonly UserRole[];
}> = [
  { prefix: "/api/admin", roles: ["MASTER_ADMIN", "PLATFORM_ADMIN"] },
  { prefix: "/api/stores", roles: ["MASTER_ADMIN", "PLATFORM_ADMIN"] },
  { prefix: "/api/audit", roles: ["BUSINESS_OWNER", "MASTER_ADMIN", "PLATFORM_ADMIN"] },
  {
    prefix: "/api/billing",
    roles: ["STORE_MANAGER", "BUSINESS_OWNER", "MASTER_ADMIN", "PLATFORM_ADMIN"],
  },
  {
    prefix: "/api/customers",
    roles: ["STAFF", "STORE_MANAGER", "BUSINESS_OWNER", "MASTER_ADMIN", "PLATFORM_ADMIN"],
  },
  {
    prefix: "/api/import",
    roles: ["STORE_MANAGER", "BUSINESS_OWNER", "MASTER_ADMIN", "PLATFORM_ADMIN"],
  },
];

export function getProtectedApiRouteForPath(pathname: string) {
  return PROTECTED_API_ROUTES.find(
    (route) =>
      pathname === route.prefix || pathname.startsWith(`${route.prefix}/`),
  );
}

export function getRedirectForRole(role: AppSession["role"]): string {
  switch (role) {
    case "STAFF":
      return STAFF_DASHBOARD_PATH;
    case "STORE_MANAGER":
      return STORE_MANAGER_DASHBOARD_PATH;
    case "BUSINESS_OWNER":
      return BUSINESS_OWNER_DASHBOARD_PATH;
    case "MASTER_ADMIN":
    case "PLATFORM_ADMIN":
      return ADMIN_DASHBOARD_PATH;
  }
}

export function getProtectedRouteForPath(pathname: string) {
  return PROTECTED_PORTAL_ROUTES.find(
    (route) =>
      pathname === route.prefix || pathname.startsWith(`${route.prefix}/`),
  );
}

export function isPathAllowedForRole(pathname: string, role: UserRole): boolean {
  const route = getProtectedRouteForPath(pathname);
  if (!route) return false;
  return route.roles.includes(role);
}

/** Maps old /store/dashboard bookmarks to the correct portal for the signed-in role. */
export function remapLegacyPortalPath(pathname: string, role: UserRole): string {
  if (
    pathname !== LEGACY_STORE_DASHBOARD_PATH &&
    !pathname.startsWith(`${LEGACY_STORE_DASHBOARD_PATH}/`)
  ) {
    return pathname;
  }

  const suffix = pathname.slice(LEGACY_STORE_DASHBOARD_PATH.length);
  return `${getRedirectForRole(role)}${suffix}`;
}

export function resolvePostAuthRedirect(
  role: UserRole,
  callbackUrl?: string | null,
): string {
  if (callbackUrl?.startsWith("/")) {
    const normalized = remapLegacyPortalPath(callbackUrl, role);
    if (isPathAllowedForRole(normalized, role)) {
      return normalized;
    }
  }

  return getRedirectForRole(role);
}

export function resolveLegacyDashboardRedirect(
  pathname: string,
  role?: UserRole,
): string {
  const suffix = pathname.slice(LEGACY_STORE_DASHBOARD_PATH.length);
  const base = role ? getRedirectForRole(role) : BUSINESS_OWNER_DASHBOARD_PATH;
  return `${base}${suffix}`;
}

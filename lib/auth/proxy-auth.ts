import {
  getProtectedApiRouteForPath,
  getProtectedRouteForPath,
  getRedirectForRole,
  LEGACY_STORE_DASHBOARD_PATH,
  resolveLegacyDashboardRedirect,
} from "@/lib/auth/routes";
import { signInRedirectUrl } from "@/lib/auth/redirect-to-sign-in";
import type { UserRole } from "@/types";

export type ProxyAuthResult =
  | { action: "next" }
  | { action: "redirect"; location: string }
  | { action: "json"; status: 401 | 403; message: string };

export function evaluateProxyAuth(
  pathname: string,
  origin: string,
  role: UserRole | undefined,
): ProxyAuthResult {
  if (
    pathname === LEGACY_STORE_DASHBOARD_PATH ||
    pathname.startsWith(`${LEGACY_STORE_DASHBOARD_PATH}/`)
  ) {
    const remappedPath = resolveLegacyDashboardRedirect(pathname, role);

    if (!role) {
      return {
        action: "redirect",
        location: signInRedirectUrl(origin, remappedPath).toString(),
      };
    }

    return {
      action: "redirect",
      location: new URL(remappedPath, origin).toString(),
    };
  }

  const protectedApiRoute = getProtectedApiRouteForPath(pathname);

  if (protectedApiRoute) {
    if (!role) {
      return { action: "json", status: 401, message: "Unauthorized" };
    }

    if (!protectedApiRoute.roles.includes(role)) {
      return { action: "json", status: 403, message: "Forbidden" };
    }

    return { action: "next" };
  }

  const protectedRoute = getProtectedRouteForPath(pathname);

  if (!protectedRoute) {
    return { action: "next" };
  }

  if (!role) {
    return {
      action: "redirect",
      location: signInRedirectUrl(origin, pathname).toString(),
    };
  }

  if (!protectedRoute.roles.includes(role)) {
    return {
      action: "redirect",
      location: new URL(getRedirectForRole(role), origin).toString(),
    };
  }

  return { action: "next" };
}

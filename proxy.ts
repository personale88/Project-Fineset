import { type NextRequest, NextResponse } from "next/server";
import {
  getProtectedApiRouteForPath,
  getProtectedRouteForPath,
  getRedirectForRole,
  LEGACY_STORE_DASHBOARD_PATH,
  PROTECTED_PORTAL_ROUTES,
  resolveLegacyDashboardRedirect,
} from "@/lib/auth/routes";
import { getSessionTokenFromRequest } from "@/lib/auth/session-cookie";
import { getAppSessionRoleFromRequestToken } from "@/lib/auth/session-store";
import type { UserRole } from "@/types";

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const sessionToken = getSessionTokenFromRequest(request);

  async function resolveRole(): Promise<UserRole | undefined> {
    if (!sessionToken) return undefined;
    const role = await getAppSessionRoleFromRequestToken(sessionToken);
    return role ?? undefined;
  }

  if (
    pathname === LEGACY_STORE_DASHBOARD_PATH ||
    pathname.startsWith(`${LEGACY_STORE_DASHBOARD_PATH}/`)
  ) {
    const role = await resolveRole();
    const remappedPath = resolveLegacyDashboardRedirect(pathname, role);

    if (!role) {
      const loginUrl = new URL("/", request.url);
      loginUrl.searchParams.set("callbackUrl", remappedPath);
      return NextResponse.redirect(loginUrl);
    }

    const destination = new URL(`${remappedPath}${search}`, request.url);
    return NextResponse.redirect(destination);
  }

  const protectedApiRoute = getProtectedApiRouteForPath(pathname);

  if (protectedApiRoute) {
    const apiRole = await resolveRole();

    if (!apiRole) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!protectedApiRoute.roles.includes(apiRole)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    return NextResponse.next({ request });
  }

  const protectedRoute = getProtectedRouteForPath(pathname);

  if (!protectedRoute) {
    return NextResponse.next({ request });
  }

  const role = await resolveRole();

  if (!role) {
    const loginUrl = new URL("/", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!protectedRoute.roles.includes(role)) {
    return NextResponse.redirect(
      new URL(getRedirectForRole(role), request.url),
    );
  }

  return NextResponse.next({ request });
}

export const config = {
  matcher: [
    "/api/admin/:path*",
    "/api/stores/:path*",
    "/api/audit/:path*",
    "/api/sync/:path*",
    "/api/analytics/:path*",
    "/api/staff/:path*",
    "/api/calls/:path*",
    "/api/visits/:path*",
    "/api/field-sales/:path*",
    "/staff/dashboard/:path*",
    "/store-manager/dashboard/:path*",
    "/business-owner/dashboard/:path*",
    "/admin/dashboard/:path*",
    "/store/dashboard/:path*",
  ],
};

export { PROTECTED_PORTAL_ROUTES };

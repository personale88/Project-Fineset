import { type NextRequest, NextResponse } from "next/server";
import {
  getDevSessionFromRequest,
  isDevAuthBypassEnabled,
} from "@/lib/auth/dev-bypass";
import {
  getProtectedRouteForPath,
  getRedirectForRole,
  LEGACY_STORE_DASHBOARD_PATH,
  PROTECTED_PORTAL_ROUTES,
  resolveLegacyDashboardRedirect,
} from "@/lib/auth/routes";
import { updateSession } from "@/lib/supabase/middleware";
import type { UserRole } from "@/types";

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (
    pathname === LEGACY_STORE_DASHBOARD_PATH ||
    pathname.startsWith(`${LEGACY_STORE_DASHBOARD_PATH}/`)
  ) {
    let role: UserRole | undefined;

    if (isDevAuthBypassEnabled()) {
      role = getDevSessionFromRequest(request)?.role;
    } else {
      const { user } = await updateSession(request);
      role = user?.app_metadata?.role as UserRole | undefined;
    }

    const remappedPath = resolveLegacyDashboardRedirect(pathname, role);

    if (!role) {
      const loginUrl = new URL("/", request.url);
      loginUrl.searchParams.set("callbackUrl", remappedPath);
      return NextResponse.redirect(loginUrl);
    }

    const destination = new URL(`${remappedPath}${search}`, request.url);
    return NextResponse.redirect(destination);
  }

  const protectedRoute = getProtectedRouteForPath(pathname);

  if (!protectedRoute) {
    if (isDevAuthBypassEnabled()) {
      return NextResponse.next({ request });
    }

    const { response } = await updateSession(request);
    return response;
  }

  if (isDevAuthBypassEnabled()) {
    const devSession = getDevSessionFromRequest(request);
    if (!devSession) {
      const loginUrl = new URL("/", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (!protectedRoute.roles.includes(devSession.role)) {
      return NextResponse.redirect(
        new URL(getRedirectForRole(devSession.role), request.url),
      );
    }

    return NextResponse.next({ request });
  }

  const { response, user, sessionExpired } = await updateSession(request);

  if (!user) {
    const loginUrl = new URL("/", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    if (sessionExpired) {
      loginUrl.searchParams.set("error", "session_expired");
    }
    return NextResponse.redirect(loginUrl);
  }

  const metadataRole = user.app_metadata?.role as UserRole | undefined;
  if (metadataRole && !protectedRoute.roles.includes(metadataRole)) {
    return NextResponse.redirect(
      new URL(getRedirectForRole(metadataRole), request.url),
    );
  }

  return response;
}

export const config = {
  matcher: [
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

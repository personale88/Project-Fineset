import { type NextRequest, NextResponse } from "next/server";
import { evaluateProxyAuth } from "@/lib/auth/proxy-auth";
import { applyExpiredSessionRedirectParams } from "@/lib/auth/redirect-to-sign-in";
import { PROTECTED_PORTAL_ROUTES } from "@/lib/auth/routes";
import {
  clearSessionCookieOnResponse,
  getSessionTokenFromRequest,
} from "@/lib/auth/session-cookie";
import { getAppSessionRoleFromRequestToken } from "@/lib/auth/session-store";
import type { UserRole } from "@/types";

function nextWithPathname(request: NextRequest, pathname: string) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const sessionToken = getSessionTokenFromRequest(request);

  async function resolveRole(): Promise<UserRole | undefined> {
    if (!sessionToken) return undefined;
    const role = await getAppSessionRoleFromRequestToken(sessionToken);
    return role ?? undefined;
  }

  const role = await resolveRole();
  const decision = evaluateProxyAuth(pathname, request.url, role);

  switch (decision.action) {
    case "next":
      return nextWithPathname(request, pathname);
    case "json":
      return NextResponse.json({ message: decision.message }, { status: decision.status });
    case "redirect": {
      const destination = new URL(decision.location);
      if (
        !destination.searchParams.has("callbackUrl") &&
        search &&
        destination.origin === new URL(request.url).origin
      ) {
        destination.search = search;
      }
      if (sessionToken && !role) {
        applyExpiredSessionRedirectParams(destination, {
          hadSessionToken: Boolean(sessionToken),
          role,
        });
      }
      const response = NextResponse.redirect(destination);
      if (sessionToken && !role) {
        clearSessionCookieOnResponse(response);
      }
      return response;
    }
  }
}

export const config = {
  matcher: [
    "/api/admin",
    "/api/admin/:path*",
    "/api/stores",
    "/api/stores/:path*",
    "/api/billing/:path*",
    "/api/customers/:path*",
    "/api/import/:path*",
    "/api/audit/:path*",
    "/api/sync/:path*",
    "/api/analytics/admin",
    "/api/analytics/admin/:path*",
    "/api/analytics/:path*",
    "/api/staff/:path*",
    "/api/calls/:path*",
    "/api/visits/:path*",
    "/api/field-sales/:path*",
    "/staff/dashboard",
    "/staff/dashboard/:path*",
    "/store-manager/dashboard",
    "/store-manager/dashboard/:path*",
    "/business-owner/dashboard",
    "/business-owner/dashboard/:path*",
    "/admin/dashboard",
    "/admin/dashboard/:path*",
    "/store/dashboard/:path*",
  ],
};

export { PROTECTED_PORTAL_ROUTES };

import { ApiError } from "@/types";

const LOGIN_PATH = "/";
const ADMIN_PORTAL_PATH_PREFIX = "/admin/dashboard";

export function isAdminPortalPagePath(pathname: string): boolean {
  return pathname.startsWith(ADMIN_PORTAL_PATH_PREFIX);
}

function buildSignInUrl(callbackPath?: string): string {
  const url = new URL(LOGIN_PATH, window.location.origin);
  url.searchParams.set("error", "session_expired");
  if (callbackPath?.startsWith("/") && callbackPath !== LOGIN_PATH) {
    url.searchParams.set("callbackUrl", callbackPath);
  }
  return url.toString();
}

let redirectInFlight = false;

/** Clears the session cookie and sends the browser to the login page. */
export function redirectToSignInAfterUnauthorized(callbackPath?: string): void {
  if (typeof window === "undefined" || redirectInFlight) return;

  const pathname = window.location.pathname;
  if (pathname === LOGIN_PATH || pathname === "/reset-password") {
    return;
  }

  redirectInFlight = true;
  const target = buildSignInUrl(callbackPath ?? `${pathname}${window.location.search}`);

  void fetch("/api/auth/signout", { method: "POST", credentials: "include" }).finally(() => {
    window.location.assign(target);
  });
}

export function isUnauthorizedApiError(error: unknown): error is ApiError {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as ApiError).status === "number" &&
    (error as ApiError).status === 401
  );
}

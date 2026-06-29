import { redirect } from "next/navigation";

export function signInRedirectUrl(origin: string, callbackPath?: string): URL {
  const loginUrl = new URL("/", origin);
  if (callbackPath?.startsWith("/")) {
    loginUrl.searchParams.set("callbackUrl", callbackPath);
  }
  return loginUrl;
}

export function redirectToSignIn(callbackPath?: string | null): never {
  if (callbackPath?.startsWith("/")) {
    redirect(`/?callbackUrl=${encodeURIComponent(callbackPath)}`);
  }
  redirect("/");
}

export function applyExpiredSessionRedirectParams(
  destination: URL,
  options: { hadSessionToken: boolean; role: string | null | undefined },
): void {
  if (options.hadSessionToken && !options.role) {
    destination.searchParams.set("error", "session_expired");
  }
}

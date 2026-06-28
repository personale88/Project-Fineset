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

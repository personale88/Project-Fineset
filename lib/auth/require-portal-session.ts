import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAppSession } from "@/lib/auth/get-app-session";
import { redirectToSignIn } from "@/lib/auth/redirect-to-sign-in";
import { getRedirectForRole } from "@/lib/auth/routes";
import type { AppSession, UserRole } from "@/types";

export async function requirePortalSession<T extends UserRole>(
  allowed: T | readonly T[],
): Promise<Extract<AppSession, { role: T }>> {
  const roles = (Array.isArray(allowed) ? allowed : [allowed]) as readonly T[];
  const session = await getAppSession();

  if (!session) {
    const headerStore = await headers();
    redirectToSignIn(headerStore.get("x-pathname"));
  }

  if (!roles.includes(session.role as T)) {
    redirect(getRedirectForRole(session.role));
  }

  return session as Extract<AppSession, { role: T }>;
}

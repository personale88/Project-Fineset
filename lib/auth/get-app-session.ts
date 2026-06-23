import { cache } from "react";
import { prisma } from "@/lib/db/prisma";
import {
  appSessionFromProfile,
  type AppUserWithRelations,
} from "@/lib/auth/app-session-from-profile";
import {
  getSessionTokenFromCookies,
} from "@/lib/auth/session-cookie";
import { getAppSessionFromToken } from "@/lib/auth/session-store";
import { isAdminPortalRole } from "@/lib/auth/admin-permissions";
import type { AppSession } from "@/types";
import type { AppRole } from "@prisma/client";

export { appSessionFromProfile } from "@/lib/auth/app-session-from-profile";

import { loadAppUserProfileByAuthId } from "@/lib/auth/load-app-user-profile";

async function resolveAppSession(): Promise<AppSession | null> {
  const token = await getSessionTokenFromCookies();
  if (!token) {
    return null;
  }

  const session = await getAppSessionFromToken(token);
  if (!session || !isAdminPortalRole(session.role)) {
    return session;
  }

  const { getImpersonatedStoreIdFromCookie } = await import("@/lib/auth/impersonation");
  const impersonatedStoreId = await getImpersonatedStoreIdFromCookie();
  if (!impersonatedStoreId) {
    return session;
  }

  return { ...session, impersonatedStoreId } as import("@/types").AdminSession;
}

/** Request-scoped session resolution from DB-backed session cookie. */
export const getAppSession = cache(resolveAppSession);

export async function getAppSessionForAuthUser(
  authId: string,
  email: string,
): Promise<AppSession | null> {
  const profile = await loadAppUserProfileByAuthId(authId);

  if (!profile?.isActive) {
    return null;
  }

  try {
    return appSessionFromProfile(profile, email);
  } catch (err) {
    console.error("[getAppSession] invalid profile", profile.id, err);
    return null;
  }
}

export async function touchLastLogin(appUserId: string): Promise<void> {
  await prisma.appUser.update({
    where: { id: appUserId },
    data: { lastLoginAt: new Date() },
  });
}

export function appRoleFromSessionRole(role: AppSession["role"]): AppRole {
  return role;
}

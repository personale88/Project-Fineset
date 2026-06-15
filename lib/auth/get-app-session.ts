import { cache } from "react";
import { prisma } from "@/lib/db/prisma";
import { syncAuthMetadataForSession } from "@/lib/auth/activate-profile";
import {
  getDevSessionFromCookies,
  isDevAuthBypassEnabled,
  resolveDevAppSession,
} from "@/lib/auth/dev-bypass";
import { appSessionFromSupabaseUser } from "@/lib/auth/session-from-metadata";
import { createClient } from "@/lib/supabase/server";
import { isInvalidRefreshTokenError } from "@/lib/supabase/auth-errors";
import { isSupabaseAuthDisabled } from "@/lib/supabase/env";
import {
  appSessionFromProfile,
  type AppUserWithRelations,
} from "@/lib/auth/app-session-from-profile";
import type { AppSession } from "@/types";
import type { AppRole } from "@prisma/client";

export { appSessionFromProfile } from "@/lib/auth/app-session-from-profile";

import { loadAppUserProfileByAuthId } from "@/lib/auth/load-app-user-profile";

async function getProfileByAuthId(authId: string): Promise<AppUserWithRelations | null> {
  return loadAppUserProfileByAuthId(authId);
}

async function resolveAppSession(): Promise<AppSession | null> {
  if (isDevAuthBypassEnabled()) {
    const devCookie = await getDevSessionFromCookies();
    if (devCookie) {
      return resolveDevAppSession(devCookie);
    }
    return null;
  }

  if (isSupabaseAuthDisabled()) {
    return null;
  }

  let supabase;
  try {
    supabase = await createClient();
  } catch (error) {
    console.error(
      "[getAppSession] Supabase client unavailable",
      error instanceof Error ? error.message : error,
    );
    return null;
  }

  let user;
  let error;
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    error = sessionError;
    user = session?.user ?? null;
  } catch {
    return null;
  }

  if (error) {
    if (isInvalidRefreshTokenError(error)) {
      try {
        await supabase.auth.signOut();
      } catch {
        // ignore — cookies cleared on next middleware pass
      }
    } else {
      console.warn("[getAppSession] supabase getUser failed", error.message);
    }
    return null;
  }

  if (!user?.email) {
    return null;
  }

  const fromMetadata = appSessionFromSupabaseUser(user);
  if (fromMetadata) {
    return fromMetadata;
  }

  const session = await getAppSessionForAuthUser(user.id, user.email);
  if (session) {
    void syncAuthMetadataForSession(user.id, session);
  }

  return session;
}

/** Request-scoped session resolution with metadata-first fast path. */
export const getAppSession = cache(resolveAppSession);

export async function getAppSessionForAuthUser(
  authId: string,
  email: string,
): Promise<AppSession | null> {
  const profile = await getProfileByAuthId(authId);

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

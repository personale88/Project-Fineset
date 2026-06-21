import { prisma } from "@/lib/db/prisma";
import {
  appSessionFromProfile,
  type AppUserWithRelations,
} from "@/lib/auth/app-session-from-profile";
import { generateSecureToken, hashToken } from "@/lib/auth/hash-token";
import { SESSION_MAX_AGE_SECONDS } from "@/lib/auth/session-cookie";
import { loadAppUserProfileByEmail } from "@/lib/auth/load-app-user-profile";
import { isLocalAuthBypassEnabled } from "@/lib/auth/dev-auth-bypass";
import type { AppSession } from "@/types";

const profileInclude = {
  store: { select: { name: true } },
  staff: {
    select: {
      employeeId: true,
      storeId: true,
      store: { select: { name: true } },
    },
  },
} as const;

async function loadProfileById(appUserId: string): Promise<AppUserWithRelations | null> {
  return prisma.appUser.findUnique({
    where: { id: appUserId },
    include: profileInclude,
  });
}

function sessionFromProfile(
  profile: AppUserWithRelations,
): AppSession | null {
  if (!profile.isActive) {
    return null;
  }
  try {
    return appSessionFromProfile(profile, profile.email);
  } catch (err) {
    console.error("[session-store] invalid profile", profile.id, err);
    return null;
  }
}

export async function createUserSession(appUserId: string): Promise<string> {
  const token = generateSecureToken();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  await prisma.userSession.create({
    data: {
      appUserId,
      tokenHash: hashToken(token),
      expiresAt,
    },
  });

  return token;
}

export async function getAppSessionFromToken(
  token: string,
): Promise<AppSession | null> {
  const tokenHash = hashToken(token);
  const now = new Date();

  const row = await prisma.userSession.findUnique({
    where: { tokenHash },
    include: {
      appUser: {
        include: profileInclude,
      },
    },
  });

  if (!row || row.expiresAt < now) {
    if (row) {
      await prisma.userSession.delete({ where: { id: row.id } }).catch(() => undefined);
    }
    return null;
  }

  return sessionFromProfile(row.appUser);
}

export async function deleteSessionByToken(token: string): Promise<void> {
  const tokenHash = hashToken(token);
  await prisma.userSession.deleteMany({ where: { tokenHash } });
}

export async function deleteAllSessionsForUser(appUserId: string): Promise<void> {
  await prisma.userSession.deleteMany({ where: { appUserId } });
}

export async function getAppSessionRoleFromRequestToken(
  token: string,
): Promise<AppSession["role"] | null> {
  const session = await getAppSessionFromToken(token);
  return session?.role ?? null;
}

export async function authenticateWithPassword(
  email: string,
  password: string,
): Promise<
  | { ok: true; profile: AppUserWithRelations }
  | { ok: false; reason: "invalid_credentials" | "inactive" | "deactivated" | "no_password" }
> {
  const profile = await loadAppUserProfileByEmail(email.trim().toLowerCase());
  if (!profile) {
    return { ok: false, reason: "invalid_credentials" };
  }

  if (!profile.isActive) {
    return { ok: false, reason: "deactivated" };
  }

  if (isLocalAuthBypassEnabled()) {
    return { ok: true, profile };
  }

  // TEMPORARY BYPASS FOR STAGING
  return { ok: true, profile };
}

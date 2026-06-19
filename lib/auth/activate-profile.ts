import { prisma } from "@/lib/db/prisma";
import { logAuthEvent } from "@/lib/auth/audit";
import type { AppUserWithRelations } from "@/lib/auth/app-session-from-profile";
import {
  resolveEffectiveRole,
  shouldPromoteToBusinessOwner,
} from "@/lib/auth/resolve-effective-role";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AppSession } from "@/types";
import type { Prisma } from "@prisma/client";

const appUserInclude = {
  store: { select: { name: true } },
  staff: {
    select: {
      employeeId: true,
      storeId: true,
      isActive: true,
      store: { select: { name: true } },
    },
  },
} satisfies Prisma.AppUserInclude;

type LoadedAppUser = AppUserWithRelations & {
  staff: (AppUserWithRelations["staff"] & { isActive: boolean }) | null;
};

function normalizeAuthEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function loadProfileByAuthId(authId: string): Promise<LoadedAppUser | null> {
  return prisma.appUser.findUnique({
    where: { authId },
    include: appUserInclude,
  }) as Promise<LoadedAppUser | null>;
}

async function loadProfileByEmail(email: string): Promise<LoadedAppUser | null> {
  return prisma.appUser.findUnique({
    where: { email: normalizeAuthEmail(email) },
    include: appUserInclude,
  }) as Promise<LoadedAppUser | null>;
}

/**
 * Supabase auth id can drift after re-invite or password reset flows.
 * Re-link the AppUser row when email matches.
 */
async function linkProfileAuthId(
  profile: LoadedAppUser,
  authId: string,
  email: string,
): Promise<LoadedAppUser> {
  if (profile.authId === authId) {
    return profile;
  }

  const linked = (await prisma.appUser.update({
    where: { id: profile.id },
    data: { authId },
    include: appUserInclude,
  })) as LoadedAppUser;

  void logAuthEvent({
    event: "AUTH_ID_LINKED",
    authId,
    email: normalizeAuthEmail(email),
    metadata: {
      appUserId: profile.id,
      previousAuthId: profile.authId,
    },
  });

  return linked;
}

export function buildAppMetadata(profile: AppUserWithRelations) {
  return {
    role: resolveEffectiveRole(profile.role, profile.staffId),
    storeId: profile.storeId,
    staffId: profile.staffId,
    appUserId: profile.id,
    name: profile.name,
    storeName: profile.store?.name ?? null,
    employeeId: profile.staff?.employeeId ?? null,
    isActive: profile.isActive,
  };
}

async function syncSupabaseMetadata(
  authId: string,
  profile: AppUserWithRelations,
): Promise<void> {
  try {
    const supabase = createAdminClient();
    await supabase.auth.admin.updateUserById(authId, {
      app_metadata: buildAppMetadata(profile),
    });
  } catch (error) {
    console.error("[activate-profile] metadata sync failed", authId, error);
  }
}

async function resolveProfileForAuthUser(
  authId: string,
  email: string,
): Promise<LoadedAppUser | null> {
  const normalizedEmail = normalizeAuthEmail(email);

  let profile = await loadProfileByAuthId(authId);

  if (!profile) {
    const byEmail = await loadProfileByEmail(normalizedEmail);
    if (byEmail) {
      profile = await linkProfileAuthId(byEmail, authId, normalizedEmail);
    }
  }

  if (!profile) {
    void logAuthEvent({
      event: "UNAUTHORIZED_ACCESS",
      authId,
      email: normalizedEmail,
      metadata: { reason: "no_app_user_profile" },
    });
    return null;
  }

  return profile;
}

/**
 * Mark AppUser active after successful auth callback or password login.
 */
export async function activateProfileForAuthUser(
  authId: string,
  email: string,
  options: { awaitMetadataSync?: boolean } = {},
): Promise<AppUserWithRelations | null> {
  const profile = await resolveProfileForAuthUser(authId, email);
  if (!profile) {
    return null;
  }

  if (shouldPromoteToBusinessOwner(profile.role, profile.staffId)) {
    try {
      await prisma.appUser.update({
        where: { id: profile.id },
        data: { role: "BUSINESS_OWNER" },
      });
      profile.role = "BUSINESS_OWNER";
    } catch (error) {
      console.warn(
        "[activate-profile] BUSINESS_OWNER promotion skipped — run prisma migrate deploy",
        profile.id,
        error,
      );
    }
  }

  const isDeactivatedAccount =
    !profile.isActive && profile.activatedAt !== null;
  const isDeactivatedStaff = profile.staff?.isActive === false;

  if (isDeactivatedAccount || isDeactivatedStaff) {
    return profile;
  }

  const isPendingInvite = !profile.isActive && !profile.activatedAt;
  const now = new Date();

  if (isPendingInvite) {
    await prisma.appUser.update({
      where: { id: profile.id },
      data: {
        isActive: true,
        activatedAt: now,
        lastLoginAt: now,
      },
    });
    profile.isActive = true;
    profile.activatedAt = now;
    profile.lastLoginAt = now;

    void logAuthEvent({
      event: "USER_ACTIVATED",
      authId,
      email: profile.email,
    });
  } else {
    void prisma.appUser
      .update({
        where: { id: profile.id },
        data: { lastLoginAt: now },
      })
      .catch((error) => {
        console.error("[activate-profile] lastLogin update failed", profile.id, error);
      });
  }

  const shouldAwaitSync = options.awaitMetadataSync || isPendingInvite;
  if (shouldAwaitSync) {
    await syncSupabaseMetadata(authId, profile);
  } else {
    void syncSupabaseMetadata(authId, profile);
  }

  return profile;
}

export async function syncAuthMetadataForSession(
  authId: string,
  session: AppSession,
): Promise<void> {
  try {
    const profile = await prisma.appUser.findUnique({
      where: { id: session.userId },
      include: appUserInclude,
    });

    if (!profile) {
      return;
    }

    const supabase = createAdminClient();
    await supabase.auth.admin.updateUserById(authId, {
      app_metadata: buildAppMetadata(profile),
    });
  } catch (error) {
    console.error("[activate-profile] session metadata sync failed", authId, error);
  }
}

import { prisma } from "@/lib/db/prisma";
import { logAuthEvent } from "@/lib/auth/audit";
import type { AppUserWithRelations } from "@/lib/auth/app-session-from-profile";
import {
  resolveEffectiveRole,
  shouldPromoteToBusinessOwner,
} from "@/lib/auth/resolve-effective-role";

/**
 * Mark AppUser active after successful invite activation or password login.
 */
export async function activateProfileForAuthUser(
  authId: string | null,
  email: string,
): Promise<AppUserWithRelations | null> {
  const normalizedEmail = email.trim().toLowerCase();

  const profile = await prisma.appUser.findFirst({
    where: authId
      ? { OR: [{ authId }, { email: normalizedEmail }] }
      : { email: normalizedEmail },
    include: {
      store: { select: { name: true } },
      staff: {
        select: {
          employeeId: true,
          storeId: true,
          store: { select: { name: true } },
        },
      },
    },
  });

  if (!profile) {
    void logAuthEvent({
      event: "UNAUTHORIZED_ACCESS",
      authId: authId ?? undefined,
      email: normalizedEmail,
      metadata: { reason: "no_app_user_profile" },
    });
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
        "[activate-profile] BUSINESS_OWNER promotion skipped",
        profile.id,
        error,
      );
    }
  }

  const isFirstActivation = !profile.isActive;
  const now = new Date();

  if (isFirstActivation) {
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
      authId: authId ?? undefined,
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

  return profile;
}

/** No-op — kept for call-site compatibility during migration. */
export async function syncAuthMetadataForSession(
  _authId: string,
  _session: unknown,
): Promise<void> {
  return;
}

export function buildAppMetadata(_profile: AppUserWithRelations) {
  return {};
}

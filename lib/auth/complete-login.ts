import { logAuthEvent } from "@/lib/auth/audit";
import { appSessionFromProfile } from "@/lib/auth/app-session-from-profile";
import { touchLastLogin } from "@/lib/auth/get-app-session";
import type { AppUserWithRelations } from "@/lib/auth/app-session-from-profile";
import type { AppSession } from "@/types";

export type CompleteLoginResult =
  | { ok: true; session: AppSession }
  | { ok: false; reason: "inactive_or_missing_profile" | "deactivated" };

function isDeactivatedProfile(profile: AppUserWithRelations): boolean {
  if (!profile.isActive && profile.activatedAt !== null) {
    return true;
  }

  const staff = profile.staff as { isActive?: boolean } | null | undefined;
  return staff?.isActive === false;
}

/**
 * Resolve AppUser profile after credential auth, activating invited users on first login.
 */
export async function completeLoginForAppUser(
  profile: AppUserWithRelations,
  email: string,
): Promise<CompleteLoginResult> {
  if (!profile) {
    return { ok: false, reason: "inactive_or_missing_profile" };
  }

  if (isDeactivatedProfile(profile)) {
    void logAuthEvent({
      event: "LOGIN_FAILED",
      email,
      metadata: { reason: "deactivated" },
    });
    return { ok: false, reason: "deactivated" };
  }

  try {
    const session = appSessionFromProfile(profile, email);
    void touchLastLogin(session.userId).catch((err) => {
      console.error("[complete-login] touchLastLogin failed", session.userId, err);
    });
    return { ok: true, session };
  } catch (err) {
    console.error("[complete-login] invalid profile", profile.id, err);
    return { ok: false, reason: "inactive_or_missing_profile" };
  }
}

export async function logLoginSuccess(
  email: string,
  session: AppSession,
  totalMs: number,
): Promise<void> {
  void logAuthEvent({
    event: "LOGIN_SUCCESS",
    email,
    metadata: {
      role: session.role,
      latencyMs: totalMs,
    },
  });
}

/** @deprecated Use completeLoginForAppUser */

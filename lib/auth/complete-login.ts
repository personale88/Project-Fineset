import { activateProfileForAuthUser } from "@/lib/auth/activate-profile";
import { logAuthEvent } from "@/lib/auth/audit";
import {
  appSessionFromProfile,
  touchLastLogin,
} from "@/lib/auth/get-app-session";
import type { AppSession } from "@/types";
import type { User } from "@supabase/supabase-js";

export type CompleteLoginResult =
  | { ok: true; session: AppSession }
  | { ok: false; reason: "inactive_or_missing_profile" | "deactivated" };

/**
 * Resolve AppUser profile after Supabase auth, activating invited users on first login.
 */
export async function completeLoginForSupabaseUser(
  user: User,
  options: { awaitMetadataSync?: boolean } = {},
): Promise<CompleteLoginResult> {
  if (!user.email) {
    return { ok: false, reason: "inactive_or_missing_profile" };
  }

  const profile = await activateProfileForAuthUser(user.id, user.email, {
    awaitMetadataSync: options.awaitMetadataSync ?? false,
  });

  if (!profile) {
    void logAuthEvent({
      event: "LOGIN_FAILED",
      authId: user.id,
      email: user.email,
      metadata: { reason: "missing_profile" },
    });
    return { ok: false, reason: "inactive_or_missing_profile" };
  }

  if (!profile.isActive) {
    void logAuthEvent({
      event: "LOGIN_FAILED",
      authId: user.id,
      email: user.email,
      metadata: { reason: "deactivated" },
    });
    return { ok: false, reason: "deactivated" };
  }

  try {
    const session = appSessionFromProfile(profile, user.email);
    void touchLastLogin(session.userId).catch((err) => {
      console.error("[complete-login] touchLastLogin failed", session.userId, err);
    });
    return { ok: true, session };
  } catch (err) {
    console.error("[complete-login] invalid profile", user.id, err);
    return { ok: false, reason: "inactive_or_missing_profile" };
  }
}

export async function logLoginSuccess(
  user: User,
  session: AppSession,
  totalMs: number,
): Promise<void> {
  void logAuthEvent({
    event: "LOGIN_SUCCESS",
    authId: user.id,
    email: user.email ?? session.email,
    metadata: {
      role: session.role,
      latencyMs: totalMs,
    },
  });
}

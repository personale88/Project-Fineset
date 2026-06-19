"use server";

import { logAuthEvent } from "@/lib/auth/audit";
import { resolvePostAuthRedirect } from "@/lib/auth/routes";
import {
  authenticateWithPassword,
  createUserSession,
} from "@/lib/auth/session-store";
import { setSessionCookie } from "@/lib/auth/session-cookie";
import { touchLastLogin } from "@/lib/auth/get-app-session";
import { appSessionFromProfile } from "@/lib/auth/app-session-from-profile";
import {
  checkLoginRateLimit,
  getRequestIdentifier,
} from "@/lib/rate-limit";

export type SignInResult =
  | { ok: true; redirectTo: string }
  | {
      ok: false;
      code: "invalid_credentials" | "inactive" | "deactivated" | "rate_limited" | "generic";
    };

function logSignIn(event: string, payload: Record<string, unknown>) {
  console.info("[auth.sign-in]", JSON.stringify({ event, ...payload }));
}

export async function signInAction(
  email: string,
  password: string,
  callbackUrl: string | null,
): Promise<SignInResult> {
  const startedAt = Date.now();
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail || !password) {
    return { ok: false, code: "generic" };
  }

  const identifier = await getRequestIdentifier();
  const rateLimit = await checkLoginRateLimit(identifier);
  if (!rateLimit.success) {
    logSignIn("throttled", { totalMs: Date.now() - startedAt });
    return { ok: false, code: "rate_limited" };
  }

  const auth = await authenticateWithPassword(normalizedEmail, password);

  if (!auth.ok) {
    void logAuthEvent({
      event: "LOGIN_FAILED",
      email: normalizedEmail,
      metadata: { reason: auth.reason },
    });

    if (auth.reason === "deactivated") {
      return { ok: false, code: "deactivated" };
    }
    if (auth.reason === "inactive" || auth.reason === "no_password") {
      return { ok: false, code: "inactive" };
    }

    logSignIn("invalid_credentials", { totalMs: Date.now() - startedAt });
    return { ok: false, code: "invalid_credentials" };
  }

  const { profile } = auth;
  const session = appSessionFromProfile(profile, normalizedEmail);
  const token = await createUserSession(profile.id);
  await setSessionCookie(token);
  await touchLastLogin(profile.id);

  void logAuthEvent({
    event: "LOGIN_SUCCESS",
    email: normalizedEmail,
    metadata: {
      role: session.role,
      latencyMs: Date.now() - startedAt,
    },
  });

  const redirectTo = resolvePostAuthRedirect(session.role, callbackUrl);

  logSignIn("success", {
    totalMs: Date.now() - startedAt,
    role: session.role,
  });

  return { ok: true, redirectTo };
}

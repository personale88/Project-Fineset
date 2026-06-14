"use server";

import { completeLoginForSupabaseUser, logLoginSuccess } from "@/lib/auth/complete-login";
import {
  createDevSessionForEmail,
  isDevAuthBypassEnabled,
  setDevSessionCookie,
} from "@/lib/auth/dev-bypass";
import { resolvePostAuthRedirect } from "@/lib/auth/routes";
import { isMetadataComplete } from "@/lib/auth/session-from-metadata";
import { logAuthEvent } from "@/lib/auth/audit";
import { createClient } from "@/lib/supabase/server";
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
  const timings: Record<string, number> = {};
  let lastMark = startedAt;
  const mark = (label: string) => {
    const now = Date.now();
    timings[label] = now - lastMark;
    lastMark = now;
  };

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !password) {
    return { ok: false, code: "generic" };
  }

  if (isDevAuthBypassEnabled()) {
    const session = await createDevSessionForEmail(normalizedEmail);
    if (!session) {
      logSignIn("dev_bypass_rejected", {
        totalMs: Date.now() - startedAt,
        email: normalizedEmail,
      });
      return { ok: false, code: "invalid_credentials" };
    }

    await setDevSessionCookie({
      email: normalizedEmail,
      role: session.role,
    });

    const redirectTo = resolvePostAuthRedirect(session.role, callbackUrl);

    logSignIn("dev_bypass_success", {
      totalMs: Date.now() - startedAt,
      role: session.role,
      email: normalizedEmail,
    });

    return { ok: true, redirectTo };
  }

  const identifier = await getRequestIdentifier();
  mark("getRequestIdentifier");

  const rateLimit = await checkLoginRateLimit(identifier);
  mark("checkLoginRateLimit");
  if (!rateLimit.success) {
    logSignIn("throttled", { totalMs: Date.now() - startedAt, timings });
    return { ok: false, code: "rate_limited" };
  }

  const supabase = await createClient();
  mark("createClient");

  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });
  mark("signInWithPassword");

  if (error || !data.user) {
    void logAuthEvent({
      event: "LOGIN_FAILED",
      email: normalizedEmail,
      metadata: { reason: error?.message ?? "sign_in_failed" },
    });
    logSignIn("invalid_credentials", {
      totalMs: Date.now() - startedAt,
      timings,
    });
    return { ok: false, code: "invalid_credentials" };
  }

  const user = data.user;
  const needsMetadataSync = !isMetadataComplete(user);

  // Always await metadata sync on login so API routes use JWT fast path (no Prisma per request).
  const result = await completeLoginForSupabaseUser(user, {
    awaitMetadataSync: true,
  });
  mark("completeLogin");

  if (!result.ok) {
    logSignIn(result.reason, { totalMs: Date.now() - startedAt, timings });
    await supabase.auth.signOut();
    if (result.reason === "deactivated") {
      return { ok: false, code: "deactivated" };
    }
    return { ok: false, code: "inactive" };
  }

  const { session } = result;

  const totalMs = Date.now() - startedAt;
  await logLoginSuccess(user, session, totalMs);

  const redirectTo = resolvePostAuthRedirect(session.role, callbackUrl);

  logSignIn("success", {
    totalMs,
    role: session.role,
    timings,
    metadataSync: needsMetadataSync,
  });

  return { ok: true, redirectTo };
}

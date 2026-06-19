import { NextResponse } from "next/server";
import { activateProfileForAuthUser } from "@/lib/auth/activate-profile";
import { appSessionFromProfile } from "@/lib/auth/get-app-session";
import {
  getPasswordRecoveryCookieOptions,
  isPasswordRecoveryRedirect,
  isRecoverySessionUser,
  PASSWORD_RECOVERY_FLOW_COOKIE,
  PASSWORD_RECOVERY_PATH,
} from "@/lib/auth/password-recovery";
import { resolvePostAuthRedirect } from "@/lib/auth/routes";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/route-handler";

function logCallback(event: string, payload: Record<string, unknown>) {
  console.info("[auth.callback]", JSON.stringify({ event, ...payload }));
}

function decodeNextParam(value: string | null): string | null {
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export async function GET(request: Request) {
  const startedAt = Date.now();
  const timings: Record<string, number> = {};
  let lastMark = startedAt;
  const mark = (label: string) => {
    const now = Date.now();
    timings[label] = now - lastMark;
    lastMark = now;
  };

  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = decodeNextParam(searchParams.get("next"));
  const type = searchParams.get("type");

  if (!code) {
    return NextResponse.redirect(`${origin}/?error=auth_callback`);
  }

  const recoveryCandidate = isPasswordRecoveryRedirect(next, type);
  const recoveryDestination = `${origin}${PASSWORD_RECOVERY_PATH}`;
  const response = NextResponse.redirect(
    recoveryCandidate ? recoveryDestination : `${origin}/`,
  );

  const supabase = await createSupabaseRouteHandlerClient(response);
  mark("createClient");

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  mark("exchangeCodeForSession");

  const isRecoveryFlow = recoveryCandidate || isRecoverySessionUser(data.user);

  if (isRecoveryFlow) {
    if (error || !data.session) {
      logCallback("reset_exchange_failed", {
        totalMs: Date.now() - startedAt,
        timings,
        message: error?.message ?? "missing_session",
      });
      return NextResponse.redirect(`${recoveryDestination}?error=auth_callback`);
    }

    logCallback("reset_success", {
      totalMs: Date.now() - startedAt,
      timings,
    });

    response.cookies.set(PASSWORD_RECOVERY_FLOW_COOKIE, "1", getPasswordRecoveryCookieOptions());
    return response;
  }

  if (error || !data.user) {
    logCallback("exchange_failed", {
      totalMs: Date.now() - startedAt,
      timings,
      message: error?.message ?? "missing_user",
    });
    return NextResponse.redirect(`${origin}/?error=auth_callback`);
  }

  const user = data.user;
  const email = user.email;
  if (!email) {
    logCallback("exchange_failed", {
      totalMs: Date.now() - startedAt,
      timings,
      reason: "missing_email",
    });
    return NextResponse.redirect(`${origin}/?error=auth_callback`);
  }

  const profile = await activateProfileForAuthUser(user.id, email, {
    awaitMetadataSync: true,
  });
  mark("activateProfile");

  if (!profile) {
    logCallback("inactive", { totalMs: Date.now() - startedAt, timings, reason: "missing_profile" });
    return NextResponse.redirect(`${origin}/?error=account_missing_profile`);
  }

  const staff = profile.staff as { isActive?: boolean } | null | undefined;
  const isDeactivated =
    (!profile.isActive && profile.activatedAt !== null) || staff?.isActive === false;

  if (isDeactivated) {
    logCallback("deactivated", { totalMs: Date.now() - startedAt, timings });
    return NextResponse.redirect(`${origin}/?error=account_deactivated`);
  }

  let role = profile.role;
  try {
    const session = appSessionFromProfile(profile, email);
    role = session.role;
  } catch (err) {
    console.error("[auth.callback] invalid profile", profile.id, err);
    return NextResponse.redirect(`${origin}/?error=account_incomplete_profile`);
  }

  const destination = resolvePostAuthRedirect(role, next);

  logCallback("success", {
    totalMs: Date.now() - startedAt,
    role,
    timings,
  });

  return copyResponseCookies(
    response,
    NextResponse.redirect(`${origin}${destination}`),
  );
}

function copyResponseCookies(source: NextResponse, target: NextResponse): NextResponse {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie);
  });
  return target;
}

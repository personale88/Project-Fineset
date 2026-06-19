"use server";

import { logAuthEvent } from "@/lib/auth/audit";
import { createPasswordResetToken } from "@/lib/auth/action-tokens";
import { sendPasswordResetEmail } from "@/lib/email/templates/auth-emails";
import { isSmtpConfigured } from "@/lib/email/env";
import { SmtpNotConfiguredError } from "@/lib/email/errors";
import { prisma } from "@/lib/db/prisma";
import {
  checkLoginRateLimit,
  getRequestIdentifier,
} from "@/lib/rate-limit";

export type PasswordResetRequestResult =
  | { ok: true }
  | {
      ok: false;
      code: "invalid_email" | "rate_limited" | "email_not_configured" | "failed";
    };

export async function requestPasswordResetAction(
  email: string,
): Promise<PasswordResetRequestResult> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return { ok: false, code: "invalid_email" };
  }

  const identifier = await getRequestIdentifier();
  const rateLimit = await checkLoginRateLimit(`${identifier}:reset:${normalizedEmail}`);
  if (!rateLimit.success) {
    return { ok: false, code: "rate_limited" };
  }

  if (!isSmtpConfigured()) {
    console.warn("[password-reset] SMTP not configured");
    return { ok: false, code: "email_not_configured" };
  }

  try {
    const appUser = await prisma.appUser.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, isActive: true },
    });

    if (appUser?.isActive) {
      const token = await createPasswordResetToken(appUser.id);
      await sendPasswordResetEmail(normalizedEmail, token);
    }

    void logAuthEvent({
      event: "PASSWORD_RESET_REQUESTED",
      email: normalizedEmail,
      metadata: { sent: Boolean(appUser?.isActive) },
    });

    return { ok: true };
  } catch (error) {
    console.error("[password-reset]", error);
    if (error instanceof SmtpNotConfiguredError) {
      return { ok: false, code: "email_not_configured" };
    }
    return { ok: false, code: "failed" };
  }
}

"use server";

import { hashCredential } from "@/lib/auth/credentials";
import {
  consumeInviteToken,
  consumePasswordResetToken,
} from "@/lib/auth/action-tokens";
import { activateProfileForAuthUser } from "@/lib/auth/activate-profile";
import { logAuthEvent } from "@/lib/auth/audit";
import { validatePassword } from "@/lib/auth/password-policy";
import { prisma } from "@/lib/db/prisma";
import { deleteAllSessionsForUser } from "@/lib/auth/session-store";

export type SetPasswordResult =
  | { ok: true }
  | {
      ok: false;
      code: "invalid_token" | "password_mismatch" | "weak_password" | "generic";
    };

export async function setPasswordAction(
  token: string,
  password: string,
  confirmPassword: string,
  isInvite = false,
): Promise<SetPasswordResult> {
  const trimmedToken = token.trim();
  if (!trimmedToken || !password || password !== confirmPassword) {
    return {
      ok: false,
      code: password !== confirmPassword ? "password_mismatch" : "generic",
    };
  }

  const passwordCheck = validatePassword(password);
  if (!passwordCheck.success) {
    return { ok: false, code: "weak_password" };
  }

  const consumed = isInvite
    ? await consumeInviteToken(trimmedToken)
    : await consumePasswordResetToken(trimmedToken);

  if (!consumed) {
    return { ok: false, code: "invalid_token" };
  }

  const appUser = await prisma.appUser.findUnique({
    where: { id: consumed.appUserId },
    select: { id: true, email: true, authId: true },
  });

  if (!appUser) {
    return { ok: false, code: "invalid_token" };
  }

  const passwordHash = await hashCredential(password);

  await prisma.appUser.update({
    where: { id: appUser.id },
    data: { passwordHash },
  });

  await activateProfileForAuthUser(appUser.authId, appUser.email);
  await deleteAllSessionsForUser(appUser.id);

  void logAuthEvent({
    event: isInvite ? "INVITE_COMPLETED" : "PASSWORD_RESET_COMPLETED",
    email: appUser.email,
  });

  return { ok: true };
}

import { prisma } from "@/lib/db/prisma";
import { generateSecureToken, hashToken } from "@/lib/auth/hash-token";

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function createPasswordResetToken(
  appUserId: string,
): Promise<string> {
  await prisma.passwordResetToken.deleteMany({
    where: { appUserId, usedAt: null },
  });

  const raw = generateSecureToken();
  await prisma.passwordResetToken.create({
    data: {
      appUserId,
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
    },
  });

  return raw;
}

export async function consumePasswordResetToken(
  raw: string,
): Promise<{ appUserId: string } | null> {
  const tokenHash = hashToken(raw);
  const now = new Date();

  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
  });

  if (!row || row.usedAt || row.expiresAt < now) {
    return null;
  }

  await prisma.passwordResetToken.update({
    where: { id: row.id },
    data: { usedAt: now },
  });

  return { appUserId: row.appUserId };
}

export async function createInviteToken(appUserId: string): Promise<string> {
  await prisma.inviteToken.deleteMany({
    where: { appUserId, usedAt: null },
  });

  const raw = generateSecureToken();
  await prisma.inviteToken.create({
    data: {
      appUserId,
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    },
  });

  return raw;
}

export async function consumeInviteToken(
  raw: string,
): Promise<{ appUserId: string } | null> {
  const tokenHash = hashToken(raw);
  const now = new Date();

  const row = await prisma.inviteToken.findUnique({
    where: { tokenHash },
  });

  if (!row || row.usedAt || row.expiresAt < now) {
    return null;
  }

  await prisma.inviteToken.update({
    where: { id: row.id },
    data: { usedAt: now },
  });

  return { appUserId: row.appUserId };
}

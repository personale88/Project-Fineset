import { randomUUID } from "crypto";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadDotenv } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { hashCredential } from "../lib/auth/credentials";
import { createPasswordResetToken, createInviteToken } from "../lib/auth/action-tokens";

loadDotenv({ path: resolve(__dirname, "../.env.local") });

const FIXTURES_PATH = resolve(__dirname, ".auth-fixtures.json");
const E2E_RESET_EMAIL = "e2e-reset@fineset.local";
const E2E_RESET_PASSWORD = "E2eFixture#9test";

export default async function globalSetup(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) {
    writeFileSync(FIXTURES_PATH, JSON.stringify({ skip: true, reason: "no DATABASE_URL" }));
    return;
  }

  const prisma = new PrismaClient();

  try {
    const passwordHash = await hashCredential(E2E_RESET_PASSWORD);
    const resetUser = await prisma.appUser.upsert({
      where: { email: E2E_RESET_EMAIL },
      create: {
        authId: randomUUID(),
        email: E2E_RESET_EMAIL,
        name: "E2E Reset User",
        role: "STAFF",
        passwordHash,
        isActive: true,
        activatedAt: new Date(),
      },
      update: {
        passwordHash,
        isActive: true,
      },
    });

    const resetToken = await createPasswordResetToken(resetUser.id);

    let inviteToken: string | null = null;
    let inviteEmail: string | null = null;
    const pendingInvite = await prisma.appUser.findFirst({
      where: {
        email: { startsWith: "e2e-invite-" },
        isActive: false,
        passwordHash: null,
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true },
    });

    if (pendingInvite) {
      inviteToken = await createInviteToken(pendingInvite.id);
      inviteEmail = pendingInvite.email;
    }

    writeFileSync(
      FIXTURES_PATH,
      JSON.stringify({
        skip: false,
        resetToken,
        resetEmail: E2E_RESET_EMAIL,
        resetPassword: E2E_RESET_PASSWORD,
        inviteToken,
        inviteEmail,
      }),
    );
  } finally {
    await prisma.$disconnect();
  }
}

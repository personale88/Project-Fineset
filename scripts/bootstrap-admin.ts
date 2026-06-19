/**
 * Create the first MASTER_ADMIN with local password auth.
 *
 * Usage: npm run auth:bootstrap
 */
import { randomUUID } from "crypto";
import { PrismaClient } from "@prisma/client";
import { hashCredential } from "../lib/auth/credentials";
import { validatePassword } from "../lib/auth/password-policy";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const email = process.env.MASTER_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.MASTER_ADMIN_PASSWORD?.trim();
  const name = process.env.MASTER_ADMIN_NAME?.trim() ?? "FineSet Admin";

  if (!email || !password) {
    throw new Error(
      "Set MASTER_ADMIN_EMAIL and MASTER_ADMIN_PASSWORD in .env.local",
    );
  }

  const passwordCheck = validatePassword(password);
  if (!passwordCheck.success) {
    throw new Error(passwordCheck.error ?? "Invalid password");
  }

  const passwordHash = await hashCredential(password);

  const appUser = await prisma.appUser.upsert({
    where: { email },
    create: {
      authId: randomUUID(),
      email,
      name,
      role: "MASTER_ADMIN",
      passwordHash,
      isActive: true,
      activatedAt: new Date(),
    },
    update: {
      name,
      role: "MASTER_ADMIN",
      passwordHash,
      isActive: true,
      activatedAt: new Date(),
    },
  });

  console.log(`MASTER_ADMIN ready: ${email} (AppUser ${appUser.id})`);
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

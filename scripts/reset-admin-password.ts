/**
 * Reset MASTER_ADMIN password in AppUser.
 *
 * Usage: npm run auth:reset-password
 */
import { PrismaClient } from "@prisma/client";
import { hashCredential } from "../lib/auth/credentials";
import { validatePassword } from "../lib/auth/password-policy";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const email = process.env.MASTER_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.MASTER_ADMIN_PASSWORD?.trim();

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

  const updated = await prisma.appUser.updateMany({
    where: { email, role: "MASTER_ADMIN" },
    data: { passwordHash, isActive: true },
  });

  if (updated.count === 0) {
    throw new Error(`No MASTER_ADMIN AppUser found for ${email}. Run auth:bootstrap first.`);
  }

  console.log(`Password updated for ${email}`);
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

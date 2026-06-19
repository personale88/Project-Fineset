/**
 * Auth + DB diagnostics (no Supabase).
 *
 * Usage: npm run auth:diagnose
 */
import { PrismaClient } from "@prisma/client";
import { isSmtpConfigured } from "../lib/email/env";
import { verifySmtpConnection } from "../lib/email/send-mail";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log("=== FineSet auth diagnose ===\n");

  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("OK: Database connected");
  } catch (error) {
    console.error("FAIL: Database", error);
    process.exit(1);
  }

  const userCount = await prisma.appUser.count();
  const activeCount = await prisma.appUser.count({ where: { isActive: true } });
  const withPassword = await prisma.appUser.count({
    where: { passwordHash: { not: null } },
  });

  console.log(`AppUser rows: ${userCount} (${activeCount} active, ${withPassword} with password)`);

  const hasAuthSecret = Boolean(
    process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim(),
  );
  console.log(hasAuthSecret ? "OK: AUTH_SECRET configured" : "FAIL: AUTH_SECRET missing");

  if (isSmtpConfigured()) {
    try {
      await verifySmtpConnection();
      console.log("OK: SMTP connection verified");
    } catch (error) {
      console.error("FAIL: SMTP verify", error instanceof Error ? error.message : error);
    }
  } else {
    console.warn("WARN: SMTP not configured (invite/reset emails disabled)");
  }

  const masterEmail = process.env.MASTER_ADMIN_EMAIL?.trim().toLowerCase();
  if (masterEmail) {
    const admin = await prisma.appUser.findUnique({ where: { email: masterEmail } });
    if (admin?.passwordHash && admin.isActive) {
      console.log(`OK: MASTER_ADMIN ${masterEmail} has password`);
    } else {
      console.warn(`WARN: Run npm run auth:bootstrap for ${masterEmail}`);
    }
  }
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

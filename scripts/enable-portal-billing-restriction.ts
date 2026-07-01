/**
 * Turn on portal blur/block when billing is overdue (staging/prod via env).
 *
 * Usage:
 *   npx dotenv -e .env.staging.local -- tsx scripts/enable-portal-billing-restriction.ts
 */
import { PrismaClient } from "@prisma/client";
import { applyDirectUrlNormalization } from "../lib/db/normalize-direct-url";
import {
  getPlatformSettings,
  updatePlatformSettings,
} from "../lib/services/platform-settings";

applyDirectUrlNormalization(process.env);
if (process.env.DIRECT_URL?.trim()) {
  process.env.DATABASE_URL = process.env.DIRECT_URL.trim();
}

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const before = await getPlatformSettings({ fresh: true });
  console.log("Before:", {
    restrictPortalOnOverdue: before.billing.restrictPortalOnOverdue,
  });

  const after = await updatePlatformSettings(
    {
      billing: {
        restrictPortalOnOverdue: true,
      },
    },
    "scripts/enable-portal-billing-restriction",
  );

  console.log("After:", {
    restrictPortalOnOverdue: after.settings.billing.restrictPortalOnOverdue,
    updatedAt: after.meta.updatedAt,
  });
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

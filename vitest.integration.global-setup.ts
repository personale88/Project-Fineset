import { config } from "dotenv";
import { resolve } from "node:path";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { DEFAULT_PLATFORM_SETTINGS } from "@/lib/platform/default-settings";
import type { PlatformSettings } from "@/lib/platform/types";

export default async function integrationGlobalSetup(): Promise<void> {
  config({ path: resolve(process.cwd(), ".env.local") });
  process.env.DEV_AUTH_BYPASS = "false";

  if (!process.env.DATABASE_URL?.trim()) return;

  const integrationConfig: PlatformSettings = {
    ...DEFAULT_PLATFORM_SETTINGS,
    billing: {
      ...DEFAULT_PLATFORM_SETTINGS.billing,
      restrictPortalOnOverdue: false,
    },
  };

  const configJson = integrationConfig as unknown as Prisma.InputJsonValue;

  await prisma.platformSettings.upsert({
    where: { id: "platform" },
    create: { id: "platform", config: configJson },
    update: { config: configJson },
  });

  await prisma.$disconnect();
}

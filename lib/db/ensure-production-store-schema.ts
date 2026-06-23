import { PrismaClient } from "@prisma/client";

const ensuredKey = Symbol.for("fineset.storeSchemaEnsured");

type GlobalEnsured = typeof globalThis & {
  [ensuredKey]?: boolean;
};

/**
 * Applies idempotent Store DDL on the database Vercel actually uses (via DIRECT_URL).
 * Vercel build cannot run migrate deploy (P1001); manual SQL often targets the wrong Supabase project.
 */
export async function ensureProductionStoreSchema(): Promise<void> {
  const g = globalThis as GlobalEnsured;
  if (g[ensuredKey]) return;

  const migrationUrl =
    process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim();
  if (!migrationUrl) {
    console.warn("[ensureProductionStoreSchema] No DIRECT_URL or DATABASE_URL");
    return;
  }

  const client = new PrismaClient({
    datasources: { db: { url: migrationUrl } },
  });

  try {
    await client.$executeRaw`
      ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "pincode" TEXT
    `;
    await client.$executeRaw`
      ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "businessOwnerName" TEXT
    `;
    await client.$executeRaw`
      ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "businessOwnerEmail" TEXT
    `;
    await client.$executeRaw`
      ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "customCategory" TEXT
    `;
    await client.$executeRaw`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'Store' AND column_name = 'email'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'Store' AND column_name = 'businessOwnerEmail'
        ) THEN
          ALTER TABLE "Store" RENAME COLUMN "email" TO "businessOwnerEmail";
        END IF;
      END $$
    `;
    await client.$executeRaw`
      ALTER TABLE "Store" DROP COLUMN IF EXISTS "email"
    `;
    await client.$executeRaw`
      ALTER TABLE "Store" DROP COLUMN IF EXISTS "pocName"
    `;
    await client.$executeRaw`
      ALTER TABLE "Store" DROP COLUMN IF EXISTS "pointOfContactPhone"
    `;
    await client.$executeRaw`
      ALTER TABLE "Store" DROP COLUMN IF EXISTS "pointOfContactRole"
    `;

    await client.$executeRaw`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'Store' AND column_name = 'customcategory'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'Store' AND column_name = 'customCategory'
        ) THEN
          ALTER TABLE "Store" RENAME COLUMN "customcategory" TO "customCategory";
        END IF;
      END $$
    `;

    await client.$executeRaw`
      CREATE TABLE IF NOT EXISTS "StoreCategoryOption" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "StoreCategoryOption_pkey" PRIMARY KEY ("id")
      )
    `;
    await client.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "StoreCategoryOption_name_key"
      ON "StoreCategoryOption"("name")
    `;
    await client.$executeRaw`
      ALTER TABLE "StoreCategoryOption" ADD COLUMN IF NOT EXISTS "label" TEXT
    `;
    await client.$executeRaw`
      ALTER TABLE "StoreCategoryOption" ADD COLUMN IF NOT EXISTS "isBuiltin" BOOLEAN NOT NULL DEFAULT false
    `;
    await client.$executeRaw`
      UPDATE "StoreCategoryOption" SET "label" = "name" WHERE "label" IS NULL OR TRIM("label") = ''
    `;

    await client.$executeRaw`
      ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "dataExpiryAt" TIMESTAMP(3)
    `;
    await client.$executeRaw`
      ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "renewalDueAt" TIMESTAMP(3)
    `;

    await client.$executeRaw`
      CREATE TABLE IF NOT EXISTS "PlatformSettings" (
        "id" TEXT NOT NULL DEFAULT 'platform',
        "config" JSONB NOT NULL,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        "updatedByEmail" TEXT,
        CONSTRAINT "PlatformSettings_pkey" PRIMARY KEY ("id")
      )
    `;

    try {
      await client.$executeRaw`
        ALTER TYPE "SourceChannel" ADD VALUE IF NOT EXISTS 'USER_CALLS'
      `;
    } catch (enumErr) {
      console.warn("[ensureProductionStoreSchema] SourceChannel enum", enumErr);
    }

    g[ensuredKey] = true;
    console.info("[ensureProductionStoreSchema] Store schema ensured");
  } catch (err) {
    console.error("[ensureProductionStoreSchema] failed", err);
    throw err;
  } finally {
    await client.$disconnect();
  }
}

export function getDatabaseHostForDiagnostics(): string {
  const url = process.env.DATABASE_URL ?? "";
  try {
    const normalized = url.replace(/^postgres(ql)?:\/\//, "https://");
    return new URL(normalized).hostname;
  } catch {
    return "(unparseable)";
  }
}

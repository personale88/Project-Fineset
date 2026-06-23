-- AlterTable
ALTER TABLE "StoreCategoryOption" ADD COLUMN IF NOT EXISTS "label" TEXT;
ALTER TABLE "StoreCategoryOption" ADD COLUMN IF NOT EXISTS "isBuiltin" BOOLEAN NOT NULL DEFAULT false;

UPDATE "StoreCategoryOption"
SET "label" = "name"
WHERE "label" IS NULL OR TRIM("label") = '';

ALTER TABLE "StoreCategoryOption" ALTER COLUMN "label" SET NOT NULL;

INSERT INTO "StoreCategoryOption" ("id", "name", "label", "isBuiltin", "createdAt", "updatedAt")
SELECT 'builtin_jewelry', 'JEWELRY', 'Jewelry', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "StoreCategoryOption" WHERE "name" = 'JEWELRY');

INSERT INTO "StoreCategoryOption" ("id", "name", "label", "isBuiltin", "createdAt", "updatedAt")
SELECT 'builtin_handbags', 'HANDBAGS', 'Handbags', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "StoreCategoryOption" WHERE "name" = 'HANDBAGS');

INSERT INTO "StoreCategoryOption" ("id", "name", "label", "isBuiltin", "createdAt", "updatedAt")
SELECT 'builtin_watches', 'WATCHES', 'Watches', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "StoreCategoryOption" WHERE "name" = 'WATCHES');

INSERT INTO "StoreCategoryOption" ("id", "name", "label", "isBuiltin", "createdAt", "updatedAt")
SELECT 'builtin_other', 'OTHER', 'Other', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "StoreCategoryOption" WHERE "name" = 'OTHER');

UPDATE "StoreCategoryOption"
SET "isBuiltin" = true, "updatedAt" = NOW()
WHERE "name" IN ('JEWELRY', 'HANDBAGS', 'WATCHES', 'OTHER');

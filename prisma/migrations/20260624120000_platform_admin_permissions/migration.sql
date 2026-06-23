-- AlterEnum
ALTER TYPE "AppRole" ADD VALUE 'PLATFORM_ADMIN';

-- AlterTable
ALTER TABLE "AppUser" ADD COLUMN "adminPermissions" JSONB;

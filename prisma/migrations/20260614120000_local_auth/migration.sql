-- Local auth: passwordHash, optional authId, session and token tables

ALTER TABLE "AppUser" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;

ALTER TABLE "AppUser" ALTER COLUMN "authId" DROP NOT NULL;

CREATE TABLE IF NOT EXISTS "UserSession" (
    "id" TEXT NOT NULL,
    "appUserId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserSession_tokenHash_key" ON "UserSession"("tokenHash");
CREATE INDEX IF NOT EXISTS "UserSession_appUserId_idx" ON "UserSession"("appUserId");
CREATE INDEX IF NOT EXISTS "UserSession_expiresAt_idx" ON "UserSession"("expiresAt");

CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "appUserId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "PasswordResetToken_appUserId_createdAt_idx" ON "PasswordResetToken"("appUserId", "createdAt" DESC);

CREATE TABLE IF NOT EXISTS "InviteToken" (
    "id" TEXT NOT NULL,
    "appUserId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InviteToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "InviteToken_tokenHash_key" ON "InviteToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "InviteToken_appUserId_createdAt_idx" ON "InviteToken"("appUserId", "createdAt" DESC);

ALTER TABLE "UserSession" DROP CONSTRAINT IF EXISTS "UserSession_appUserId_fkey";
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PasswordResetToken" DROP CONSTRAINT IF EXISTS "PasswordResetToken_appUserId_fkey";
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InviteToken" DROP CONSTRAINT IF EXISTS "InviteToken_appUserId_fkey";
ALTER TABLE "InviteToken" ADD CONSTRAINT "InviteToken_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

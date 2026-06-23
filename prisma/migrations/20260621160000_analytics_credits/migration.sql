-- Analytics AI credits for master admin

CREATE TYPE "AnalyticsCreditLedgerType" AS ENUM ('GRANT', 'RECHARGE', 'USAGE');

CREATE TABLE "AnalyticsCreditAccount" (
    "id" TEXT NOT NULL,
    "appUserId" TEXT NOT NULL,
    "balanceCredits" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalyticsCreditAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AnalyticsCreditLedger" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "type" "AnalyticsCreditLedgerType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "packId" TEXT,
    "tokensUsed" INTEGER,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsCreditLedger_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AnalyticsCreditAccount_appUserId_key" ON "AnalyticsCreditAccount"("appUserId");
CREATE INDEX "AnalyticsCreditAccount_appUserId_idx" ON "AnalyticsCreditAccount"("appUserId");
CREATE INDEX "AnalyticsCreditLedger_accountId_createdAt_idx" ON "AnalyticsCreditLedger"("accountId", "createdAt" DESC);

ALTER TABLE "AnalyticsCreditAccount" ADD CONSTRAINT "AnalyticsCreditAccount_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnalyticsCreditLedger" ADD CONSTRAINT "AnalyticsCreditLedger_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "AnalyticsCreditAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

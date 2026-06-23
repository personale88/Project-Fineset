-- CreateEnum
CREATE TYPE "AutomationRunTrigger" AS ENUM ('CRON', 'MANUAL', 'DRY_RUN');

-- CreateEnum
CREATE TYPE "AutomationRunStatus" AS ENUM ('RUNNING', 'SUCCESS', 'PARTIAL', 'FAILED');

-- CreateTable
CREATE TABLE "PlatformAutomationConfig" (
    "id" TEXT NOT NULL DEFAULT 'platform',
    "config" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedByEmail" TEXT,

    CONSTRAINT "PlatformAutomationConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationRunLog" (
    "id" TEXT NOT NULL,
    "trigger" "AutomationRunTrigger" NOT NULL,
    "status" "AutomationRunStatus" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "summary" JSONB NOT NULL,
    "errors" JSONB,
    "triggeredByEmail" TEXT,

    CONSTRAINT "AutomationRunLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AutomationRunLog_startedAt_idx" ON "AutomationRunLog"("startedAt" DESC);

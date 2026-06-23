-- CreateTable
CREATE TABLE "AutomationDeliveryLog" (
    "id" TEXT NOT NULL,
    "businessKey" TEXT,
    "actionType" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "channel" TEXT,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutomationDeliveryLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AutomationDeliveryLog_dedupeKey_key" ON "AutomationDeliveryLog"("dedupeKey");

-- CreateIndex
CREATE INDEX "AutomationDeliveryLog_businessKey_actionType_createdAt_idx" ON "AutomationDeliveryLog"("businessKey", "actionType", "createdAt" DESC);

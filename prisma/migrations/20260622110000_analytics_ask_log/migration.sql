-- Creates the AnalyticsAskLog table for audit persistence.
-- Replaces console.log audit with a queryable DB table for cost tracking,
-- debugging, and usage analytics.

CREATE TABLE IF NOT EXISTS "AnalyticsAskLog" (
  "id"               TEXT NOT NULL,
  "appUserId"        TEXT NOT NULL,
  "promptLength"     INTEGER NOT NULL,
  "parseSource"      TEXT NOT NULL,
  "parseConfidence"  TEXT NOT NULL,
  "dataAvailability" TEXT NOT NULL,
  "status"           TEXT NOT NULL,
  "errorCode"        TEXT,
  "durationMs"       INTEGER NOT NULL,
  "intentTokensIn"   INTEGER,
  "intentTokensOut"  INTEGER,
  "reportTokensIn"   INTEGER,
  "reportTokensOut"  INTEGER,
  "totalCostUsd"     DOUBLE PRECISION,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AnalyticsAskLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AnalyticsAskLog_appUserId_createdAt_idx"
  ON "AnalyticsAskLog" ("appUserId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "AnalyticsAskLog_status_createdAt_idx"
  ON "AnalyticsAskLog" ("status", "createdAt" DESC);

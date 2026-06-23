-- Creates a materialized view that pre-aggregates visit KPIs by day and dimension.
-- This replaces the expensive prisma.visit.findMany + JS aggregation path.
-- Querying this view for a full month returns ~30-60 rows instead of 10,000+.
--
-- Visit columns are camelCase (Prisma default); output aliases use snake_case for
-- aggregate-queries.ts. Null-safe index keys are materialized as columns so the
-- unique index avoids non-IMMUTABLE COALESCE expressions.

CREATE MATERIALIZED VIEW IF NOT EXISTS visit_daily_aggregate AS
SELECT
  "storeId"                                                                       AS store_id,
  "staffId"                                                                       AS staff_id,
  DATE("visitDate")                                                               AS date,
  "customerType"                                                                  AS customer_type,
  "sourceChannel"                                                                 AS source_channel,
  "intentTier"                                                                    AS intent_tier,
  "purchaseStatus"                                                                AS purchase_status,
  "budgetStated"                                                                  AS budget_stated,
  COALESCE("intentTier"::text, '__null__')                                        AS intent_tier_key,
  COALESCE("budgetStated"::text, '__null__')                                      AS budget_stated_key,
  COUNT(*)                                                                        AS total_visits,
  COUNT(*) FILTER (WHERE "purchaseStatus" = 'PURCHASED')                          AS purchased_count,
  COALESCE(SUM("transactionAmount") FILTER (WHERE "purchaseStatus" = 'PURCHASED'), 0) AS total_revenue,
  COUNT(DISTINCT "customerPhoneHash")                                             AS unique_customers,
  AVG("transactionAmount") FILTER (WHERE "purchaseStatus" = 'PURCHASED')          AS avg_transaction
FROM "Visit"
GROUP BY
  "storeId",
  "staffId",
  DATE("visitDate"),
  "customerType",
  "sourceChannel",
  "intentTier",
  "purchaseStatus",
  "budgetStated";

-- Unique index required for CONCURRENTLY refresh.
CREATE UNIQUE INDEX IF NOT EXISTS visit_daily_aggregate_pk
  ON visit_daily_aggregate (
    store_id,
    staff_id,
    date,
    customer_type,
    source_channel,
    intent_tier_key,
    purchase_status,
    budget_stated_key
  );

-- Convenience function so application code can trigger a non-blocking refresh.
CREATE OR REPLACE FUNCTION refresh_visit_aggregate()
RETURNS void AS $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY visit_daily_aggregate;
$$ LANGUAGE sql SECURITY DEFINER;

-- Additional supporting indexes on the Visit table for analytic query patterns.
CREATE INDEX IF NOT EXISTS "Visit_storeId_visitDate_purchaseStatus_idx"
  ON "Visit" ("storeId", "visitDate" DESC, "purchaseStatus");

CREATE INDEX IF NOT EXISTS "Visit_storeId_visitDate_customerType_sourceChannel_idx"
  ON "Visit" ("storeId", "visitDate" DESC, "customerType", "sourceChannel");

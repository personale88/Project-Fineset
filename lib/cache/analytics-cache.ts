/**
 * Redis caching layer for analytics queries.
 *
 * Uses Upstash Redis — the same client already wired for rate-limiting.
 * All cache reads fall back to live data on error so Redis failure never
 * breaks the ask flow.
 *
 * Cache buckets:
 *   summary  — full AdminBusinessAnalytics object, TTL 5 min
 *   filters  — AdminBusinessAnalyticsFilterOptions, TTL 30 min
 *   intent   — ParsedAnalyticsAskIntent keyed by prompt SHA-256, TTL 60 min
 */

import { Redis } from "@upstash/redis";
import { createHash } from "crypto";
import type { AdminBusinessAnalytics } from "@/types/admin-business-analytics";
import type { AdminBusinessAnalyticsFilterOptions } from "@/types/admin-business-analytics";
import type { ParsedAnalyticsAskIntent } from "@/lib/validations/admin-business-analytics-ask.schema";

// ---------------------------------------------------------------------------
// Redis client (lazy, shared)
// ---------------------------------------------------------------------------

let _redis: Redis | null | undefined;

function getRedis(): Redis | null {
  if (_redis !== undefined) return _redis;

  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (!url || !token) {
    _redis = null;
    return null;
  }

  _redis = new Redis({ url, token });
  return _redis;
}

// ---------------------------------------------------------------------------
// Key helpers
// ---------------------------------------------------------------------------

export const CACHE_KEYS = {
  summary: (queryHash: string) => `fineset:analytics:summary:${queryHash}`,
  filters: (scopeKey: string)  => `fineset:analytics:filters:${scopeKey}`,
  intent:  (promptHash: string)=> `fineset:analytics:intent:${promptHash}`,
};

export function hashQueryKey(obj: unknown): string {
  return createHash("sha256").update(JSON.stringify(obj)).digest("hex").slice(0, 32);
}

export function hashPrompt(prompt: string): string {
  return createHash("sha256")
    .update(prompt.trim().toLowerCase())
    .digest("hex")
    .slice(0, 32);
}

// ---------------------------------------------------------------------------
// Summary cache — full AdminBusinessAnalytics object, 5-minute TTL
// ---------------------------------------------------------------------------

const SUMMARY_TTL_SECONDS = 5 * 60;

export async function getCachedSummary(
  queryHash: string,
): Promise<AdminBusinessAnalytics | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    return await redis.get<AdminBusinessAnalytics>(CACHE_KEYS.summary(queryHash));
  } catch (err) {
    console.warn("[analytics-cache] summary get failed", err);
    return null;
  }
}

export async function setCachedSummary(
  queryHash: string,
  data: AdminBusinessAnalytics,
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.set(CACHE_KEYS.summary(queryHash), data, { ex: SUMMARY_TTL_SECONDS });
  } catch (err) {
    console.warn("[analytics-cache] summary set failed", err);
  }
}

/**
 * Call after a visit write to bust any cached summaries.
 * Upstash doesn't support pattern deletes cheaply so we use a version key:
 * increment it so all existing hashes effectively become stale.
 * New hashes include the version, so old entries expire naturally via TTL.
 */
export async function invalidateSummaryCache(): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.incr("fineset:analytics:summary:version");
  } catch (err) {
    console.warn("[analytics-cache] invalidation failed", err);
  }
}

/**
 * Builds a cache key that includes the current version so stale entries
 * are automatically excluded without explicit deletion.
 */
export async function buildVersionedQueryKey(queryObj: unknown): Promise<string> {
  const redis = getRedis();
  let version = "0";
  if (redis) {
    try {
      const v = await redis.get<number>("fineset:analytics:summary:version");
      version = String(v ?? 0);
    } catch {
      // non-fatal — use version 0
    }
  }
  return hashQueryKey({ query: queryObj, v: version });
}

// ---------------------------------------------------------------------------
// Filter options cache — 30-minute TTL
// ---------------------------------------------------------------------------

const FILTERS_TTL_SECONDS = 30 * 60;

export async function getCachedFilterOptions(
  scopeKey: string,
): Promise<AdminBusinessAnalyticsFilterOptions | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    return await redis.get<AdminBusinessAnalyticsFilterOptions>(CACHE_KEYS.filters(scopeKey));
  } catch (err) {
    console.warn("[analytics-cache] filters get failed", err);
    return null;
  }
}

export async function setCachedFilterOptions(
  scopeKey: string,
  data: AdminBusinessAnalyticsFilterOptions,
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.set(CACHE_KEYS.filters(scopeKey), data, { ex: FILTERS_TTL_SECONDS });
  } catch (err) {
    console.warn("[analytics-cache] filters set failed", err);
  }
}

// ---------------------------------------------------------------------------
// Intent cache — parsed Gemini intent keyed by prompt hash, 60-minute TTL
// ---------------------------------------------------------------------------

const INTENT_TTL_SECONDS = 60 * 60;

export async function getCachedIntent(
  promptHash: string,
): Promise<ParsedAnalyticsAskIntent | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    return await redis.get<ParsedAnalyticsAskIntent>(CACHE_KEYS.intent(promptHash));
  } catch (err) {
    console.warn("[analytics-cache] intent get failed", err);
    return null;
  }
}

export async function setCachedIntent(
  promptHash: string,
  intent: ParsedAnalyticsAskIntent,
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.set(CACHE_KEYS.intent(promptHash), intent, { ex: INTENT_TTL_SECONDS });
  } catch (err) {
    console.warn("[analytics-cache] intent set failed", err);
  }
}

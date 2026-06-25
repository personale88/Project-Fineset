import { Redis } from "@upstash/redis";
import type { SyncVersionPayload } from "@/lib/sync/version";

const KEY_PREFIX = "fineset:sync:event:";
const TTL_SECONDS = 120;

function createRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

let redisClient: Redis | null | undefined;

function getRedis(): Redis | null {
  redisClient ??= createRedisClient();
  return redisClient;
}

function eventKey(scope: string): string {
  return `${KEY_PREFIX}${scope}`;
}

/** Persist latest sync payload so other serverless instances can pick it up on heartbeat. */
export async function publishSyncEventToRedis(
  payload: SyncVersionPayload,
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    await redis.set(eventKey(payload.scope), JSON.stringify(payload), {
      ex: TTL_SECONDS,
    });
  } catch (error) {
    console.warn("[sync.redis] publish failed", error);
  }
}

export async function getLatestRemoteSyncEvent(
  scope: string,
): Promise<SyncVersionPayload | null> {
  const redis = getRedis();
  if (!redis) return null;

  try {
    const raw = await redis.get<string>(eventKey(scope));
    if (!raw) return null;
    return JSON.parse(raw) as SyncVersionPayload;
  } catch (error) {
    console.warn("[sync.redis] fetch failed", error);
    return null;
  }
}

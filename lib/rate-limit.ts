import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { isProduction } from "@/lib/env";

type RateLimitResult =
  | { success: true }
  | { success: false; retryAfterSeconds: number };

const LIMITER_TIMEOUT_MS = 250;

function isNextBuild(): boolean {
  return process.env.NEXT_PHASE === "phase-production-build";
}

function createRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    if (isProduction() && !isNextBuild()) {
      console.warn(
        "[rate-limit] Upstash Redis not configured — rate limiting disabled in production",
      );
    } else if (!isProduction()) {
      console.warn(
        "[rate-limit] Upstash Redis not configured — rate limiting disabled in development",
      );
    }
    return null;
  }
  return new Redis({ url, token });
}

function createLimiter(
  prefix: string,
  requests: number,
  window: `${number} ${"s" | "m" | "h" | "d"}`,
): Ratelimit | null {
  const redis = createRedisClient();
  if (!redis) return null;

  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window),
    prefix,
    analytics: false,
  });
}

let loginLimiter: Ratelimit | null | undefined;
let writeLimiter: Ratelimit | null | undefined;
let sseLimiter: Ratelimit | null | undefined;
let phoneRevealLimiter: Ratelimit | null | undefined;

/** Rate limits run in production only unless ENABLE_RATE_LIMIT=true (avoids dev Upstash timeouts). */
function isRateLimitEnabled(): boolean {
  if (process.env.ENABLE_RATE_LIMIT === "true") return true;
  return isProduction();
}

function getLoginLimiter(): Ratelimit | null {
  if (!isRateLimitEnabled()) return null;
  loginLimiter ??= createLimiter("fineset:login", 10, "15 m");
  return loginLimiter;
}

function getWriteLimiter(): Ratelimit | null {
  if (!isRateLimitEnabled()) return null;
  writeLimiter ??= createLimiter("fineset:write", 60, "15 m");
  return writeLimiter;
}

function getSseLimiter(): Ratelimit | null {
  if (!isRateLimitEnabled()) return null;
  sseLimiter ??= createLimiter("fineset:sse", 30, "15 m");
  return sseLimiter;
}

function getPhoneRevealLimiter(): Ratelimit | null {
  if (!isRateLimitEnabled()) return null;
  phoneRevealLimiter ??= createLimiter("fineset:phone-reveal", 120, "15 m");
  return phoneRevealLimiter;
}

async function checkLimit(
  limiter: Ratelimit | null,
  identifier: string,
): Promise<RateLimitResult> {
  if (!limiter) return { success: true };
  try {
    const result = await Promise.race([
      limiter.limit(identifier),
      new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), LIMITER_TIMEOUT_MS);
      }),
    ]);

    // Fail-open on limiter timeout to avoid auth/write latency spikes.
    if (!result) {
      console.warn("[rate-limit] timeout — bypassing limiter", {
        timeoutMs: LIMITER_TIMEOUT_MS,
      });
      return { success: true };
    }

    if (result.success) return { success: true };

    return {
      success: false,
      retryAfterSeconds: Math.ceil((result.reset - Date.now()) / 1000),
    };
  } catch (error) {
    // Fail-open on transient Upstash/network errors.
    console.warn("[rate-limit] check failed — bypassing limiter", error);
    return { success: true };
  }
}

export async function checkLoginRateLimit(
  identifier: string,
): Promise<RateLimitResult> {
  return checkLimit(getLoginLimiter(), identifier);
}

export async function checkWriteRateLimit(
  identifier: string,
): Promise<RateLimitResult> {
  return checkLimit(getWriteLimiter(), identifier);
}

export async function checkSseRateLimit(
  identifier: string,
): Promise<RateLimitResult> {
  return checkLimit(getSseLimiter(), identifier);
}

let analyticsAskLimiter: Ratelimit | null | undefined;

function getAnalyticsAskLimiter(): Ratelimit | null {
  if (!isRateLimitEnabled()) return null;
  analyticsAskLimiter ??= createLimiter("fineset:analytics-ask", 30, "15 m");
  return analyticsAskLimiter;
}

export async function checkAnalyticsAskRateLimit(
  identifier: string,
): Promise<RateLimitResult> {
  return checkLimit(getAnalyticsAskLimiter(), identifier);
}

export async function checkPhoneRevealRateLimit(
  identifier: string,
): Promise<RateLimitResult> {
  return checkLimit(getPhoneRevealLimiter(), identifier);
}

export async function getRequestIdentifier(): Promise<string> {
  const { headers } = await import("next/headers");
  const headerStore = await headers();
  const forwarded = headerStore.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? "unknown";
  return ip;
}

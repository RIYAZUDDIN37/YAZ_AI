import { getRedis } from "@/server/redis/client";

/**
 * Fixed-window rate limiting for public, unauthenticated endpoints (the
 * widget API — nothing else in the app is reachable without a session).
 * Redis-backed when available (correct across multiple server
 * instances); falls back to an in-memory Map in the same process
 * otherwise — real, but only correct for a single instance, which is
 * what this actually runs as today. Never throws: a Redis hiccup must
 * fail open (allow the request) rather than take down the widget.
 */
const memoryBuckets = new Map<string, { count: number; resetAt: number }>();

function checkMemory(key: string, limit: number, windowSeconds: number): boolean {
  const now = Date.now();
  const bucket = memoryBuckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    memoryBuckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const redis = getRedis();
  if (!redis) {
    return checkMemory(key, limit, windowSeconds);
  }

  try {
    const redisKey = `ratelimit:${key}`;
    const count = await redis.incr(redisKey);
    if (count === 1) {
      await redis.expire(redisKey, windowSeconds);
    }
    return count <= limit;
  } catch (error) {
    console.error("[rate-limit] Redis check failed, falling back to in-memory", error);
    return checkMemory(key, limit, windowSeconds);
  }
}

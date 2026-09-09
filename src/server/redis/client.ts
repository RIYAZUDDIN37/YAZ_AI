import Redis from "ioredis";
import { env } from "@/lib/env";

/**
 * Redis was provisioned (docker-compose, REDIS_URL) since Phase 0-1 but
 * nothing used it — Phase 13's automations turned out not to need a
 * queue (see schema.prisma's Automations section comment). The public
 * widget endpoint (Phase 16) is the first real use: rate limiting that
 * actually works across multiple server instances, not an in-memory Map
 * that resets per-process.
 *
 * `getRedis()` returns null (never throws) if REDIS_URL isn't set or the
 * connection fails — callers must treat Redis as an optional accelerator
 * for rate limiting, never a hard dependency for the request to
 * succeed. See src/lib/rate-limit.ts.
 */
let client: Redis | null = null;
let attempted = false;

export function getRedis(): Redis | null {
  if (!env.REDIS_URL) return null;
  if (attempted) return client;

  attempted = true;
  try {
    client = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      retryStrategy: () => null, // never keep the request waiting on a retry loop
      lazyConnect: false,
    });
    client.on("error", (error) => {
      console.error("[redis] connection error — rate limiting will fall back to in-memory", error.message);
    });
  } catch (error) {
    console.error("[redis] failed to initialize client", error);
    client = null;
  }

  return client;
}

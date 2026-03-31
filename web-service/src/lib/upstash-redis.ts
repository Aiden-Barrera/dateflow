import { Redis, type RedisConfigNodejs } from "@upstash/redis";

let redisClient: Redis | null = null;

/**
 * Returns a singleton Upstash Redis client.
 *
 * Used by VenueCache to cache Google Places results across sessions.
 * Upstash is serverless-compatible (no persistent connection pool needed).
 *
 * @throws If UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN are missing.
 */
export function getRedisClient(): Redis {
  if (redisClient) {
    return redisClient;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url) {
    throw new Error(
      "Missing UPSTASH_REDIS_REST_URL — add it to .env.local (get it from https://console.upstash.com/redis)"
    );
  }

  if (!token) {
    throw new Error(
      "Missing UPSTASH_REDIS_REST_TOKEN — add it to .env.local (get it from https://console.upstash.com/redis)"
    );
  }

  redisClient = new Redis({
    url,
    token,
  } as RedisConfigNodejs);

  return redisClient;
}

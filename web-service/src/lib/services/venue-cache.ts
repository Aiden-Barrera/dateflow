import { getRedisClient } from "../upstash-redis";
import type { PlaceCandidate } from "../types/venue";
import type { Category } from "../types/preference";
import type { Location } from "../types/preference";

/**
 * Redis-backed cache for Google Places API results.
 *
 * Caches venue candidates by location (rounded to ~1 km precision),
 * categories, and price level. TTL is 6 hours — venue data doesn't change
 * frequently, and stale results are better than repeated API calls.
 *
 * Keys are built from normalized search parameters so semantically identical
 * searches (e.g., within the same city) share cache entries.
 */
export class VenueCache {
  private redis = getRedisClient();
  private static readonly KEY_VERSION = "v2";

  private getValuePreview(value: unknown): string {
    if (typeof value === "string") {
      return value.slice(0, 160);
    }

    try {
      return JSON.stringify(value).slice(0, 160);
    } catch {
      return String(value).slice(0, 160);
    }
  }

  /**
   * Builds a cache key from search parameters.
   *
   * Location coordinates are rounded to 2 decimal places (~1 km precision).
   * Categories are sorted alphabetically so different orderings produce the same key.
   * Price level is included so different budget tiers cache separately.
   *
   * Example: `venue:cache:v2:30.27:-97.74:BAR:RESTAURANT:2`
   */
  buildKey(
    location: Location,
    categories: readonly Category[],
    priceLevel: number
  ): string {
    // Round to 2 decimal places (roughly 1 km precision)
    const lat = Math.round(location.lat * 100) / 100;
    const lng = Math.round(location.lng * 100) / 100;

    // Sort categories so order doesn't matter
    const sortedCategories = [...categories].sort().join(":");

    return `venue:cache:${VenueCache.KEY_VERSION}:${lat}:${lng}:${sortedCategories}:${priceLevel}`;
  }

  /**
   * Retrieves cached candidates from Redis, or null if not cached.
   *
   * Returns null if:
   * - The key doesn't exist (cache miss)
   * - The TTL expired (Redis auto-deletes)
   * - Redis is unavailable (error is logged, but doesn't crash)
   * - Cached data is invalid JSON (error is logged, treated as cache miss)
   */
  async get(key: string): Promise<readonly PlaceCandidate[] | null> {
    try {
      const cached = await this.redis.get(key);

      if (!cached) {
        return null;
      }

      if (typeof cached === "string") {
        return JSON.parse(cached) as readonly PlaceCandidate[];
      }

      if (Array.isArray(cached)) {
        console.warn(`[VenueCache.get] Returning non-string cached value for key "${key}"`, {
          valueType: typeof cached,
          preview: this.getValuePreview(cached),
        });
        return cached as readonly PlaceCandidate[];
      }

      console.warn(`[VenueCache.get] Unexpected cached value shape for key "${key}"`, {
        valueType: typeof cached,
        preview: this.getValuePreview(cached),
      });
      return null;
    } catch (err) {
      // Log errors but don't crash — cache misses are acceptable.
      // If Redis is down, we'll just call Google Places directly.
      const cachedValue =
        err instanceof SyntaxError
          ? await this.redis.get(key).catch(() => null)
          : null;

      console.error(`[VenueCache.get] Failed to retrieve key "${key}":`, err, {
        cachedValueType: cachedValue === null ? "null" : typeof cachedValue,
        cachedValuePreview:
          cachedValue === null ? null : this.getValuePreview(cachedValue),
      });
      return null;
    }
  }

  /**
   * Stores candidates in Redis with a TTL (time-to-live).
   *
   * Errors are logged but don't crash — if Redis is unavailable,
   * the app continues to work (just without caching).
   *
   * @param key Cache key (built by buildKey)
   * @param candidates Venue candidates to cache
   * @param ttlSeconds How long to keep the data in Redis (e.g., 6 hours = 21600 seconds)
   */
  async set(
    key: string,
    candidates: readonly PlaceCandidate[],
    ttlSeconds: number
  ): Promise<void> {
    try {
      await this.redis.set(key, JSON.stringify(candidates), {
        ex: ttlSeconds,
      });
    } catch (err) {
      // Log the error but don't throw — caching failures are non-critical.
      console.error(
        `[VenueCache.set] Failed to store key "${key}":`,
        err
      );
    }
  }
}

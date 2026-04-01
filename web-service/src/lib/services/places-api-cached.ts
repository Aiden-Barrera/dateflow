import type { Location, Category } from "../types/preference";
import type { PlaceCandidate } from "../types/venue";
import { VenueCache } from "./venue-cache";
import { searchNearby } from "./places-api-client";

/**
 * Cache TTL: 6 hours in seconds.
 * Venue data doesn't change often, and stale results are far cheaper
 * than redundant Google Places API calls.
 */
export const CACHE_TTL_SECONDS = 21_600;

/**
 * Searches for nearby venues with a Redis cache layer in front of Google Places.
 *
 * Flow:
 * 1. Build a cache key from the search parameters
 * 2. Check Redis — if hit, return cached candidates immediately
 * 3. On miss (or cache error), call Google Places API
 * 4. Store the fresh results in Redis for future searches
 *
 * Cache failures are non-fatal: if Redis is down, we just call Google directly.
 * This means the generation pipeline never fails because of a cache outage.
 */
export async function searchNearbyWithCache(
  location: Location,
  radius: number,
  categories: readonly Category[],
  maxPrice: number
): Promise<readonly PlaceCandidate[]> {
  const cache = new VenueCache();
  const cacheKey = cache.buildKey(location, categories, maxPrice);

  // Try cache first
  try {
    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached;
    }
  } catch (err) {
    // Cache read failed — log and fall through to API call
    console.error("[searchNearbyWithCache] Cache read failed, calling API:", err);
  }

  // Cache miss or error — call Google Places
  const candidates = await searchNearby(location, radius, categories, maxPrice);

  // Write to cache (fire-and-forget — don't block on this)
  cache.set(cacheKey, candidates, CACHE_TTL_SECONDS).catch((err) => {
    console.error("[searchNearbyWithCache] Cache write failed:", err);
  });

  return candidates;
}

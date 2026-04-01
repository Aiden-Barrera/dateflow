import type { Location, Category } from "../types/preference";
import type { PlaceCandidate } from "../types/venue";
import { VenueCache } from "./venue-cache";
import { searchNearby, categoriesToGoogleTypes } from "./places-api-client";

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
  let cache: VenueCache | null = null;
  let cacheKey: string | null = null;

  try {
    cache = new VenueCache();
    const baseKey = cache.buildKey(location, categories, maxPrice);
    cacheKey = `${baseKey}:radius=${radius}`;
  } catch (err) {
    // Cache initialization failed — log and continue without caching.
    console.error(
      "[searchNearbyWithCache] Cache unavailable, calling API without cache:",
      err
    );
  }

  // Try cache first
  if (cache && cacheKey) {
    try {
      const cached = await cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    } catch (err) {
      // Cache read failed — log and fall through to API call
      console.error("[searchNearbyWithCache] Cache read failed, calling API:", err);
    }
  }

  // Convert our Category enums to Google Places type strings
  const googleTypes = categoriesToGoogleTypes(categories);

  // Cache miss or error — call Google Places
  const candidates = await searchNearby(location, radius, googleTypes, maxPrice);

  // Write to cache (fire-and-forget — don't block on this)
  if (cache && cacheKey) {
    cache.set(cacheKey, candidates, CACHE_TTL_SECONDS).catch((err) => {
      console.error("[searchNearbyWithCache] Cache write failed:", err);
    });
  }

  return candidates;
}

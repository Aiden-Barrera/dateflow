import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildGooglePlacePhotoUrl,
  getGooglePlacesReadiness,
  mapGoogleTypeToCategory,
  searchNearby,
} from "../places-api-client";
import type { Location } from "../../types/preference";

// Mock global fetch — PlacesAPIClient uses it to call Google's REST API
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Mock the env var so we don't need a real key in tests
vi.stubEnv("GOOGLE_PLACES_API_KEY", "test-api-key");

describe("places-api-client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("GOOGLE_PLACES_API_KEY", "test-api-key");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://dateflow.test");
  });

  it("reports ready when Google Places config is present", () => {
    expect(getGooglePlacesReadiness()).toEqual({
      ready: true,
      missing: [],
    });
  });

  it("reports missing Google Places config explicitly", () => {
    vi.stubEnv("GOOGLE_PLACES_API_KEY", "");

    expect(getGooglePlacesReadiness()).toEqual({
      ready: false,
      missing: ["GOOGLE_PLACES_API_KEY"],
    });
  });

  // ------------------------------------------------------------------
  // mapGoogleTypeToCategory
  // ------------------------------------------------------------------

  describe("mapGoogleTypeToCategory", () => {
    it("maps restaurant types to RESTAURANT", () => {
      expect(mapGoogleTypeToCategory(["restaurant", "food"])).toBe("RESTAURANT");
    });

    it("maps bar types to BAR", () => {
      expect(mapGoogleTypeToCategory(["bar", "night_club"])).toBe("BAR");
    });

    it("maps activity types to ACTIVITY", () => {
      expect(mapGoogleTypeToCategory(["bowling_alley", "amusement_park"])).toBe("ACTIVITY");
    });

    it("maps event types to EVENT", () => {
      expect(mapGoogleTypeToCategory(["movie_theater", "performing_arts_theater"])).toBe("EVENT");
    });

    it("returns ACTIVITY as fallback for unknown types", () => {
      expect(mapGoogleTypeToCategory(["unknown_type"])).toBe("ACTIVITY");
    });

    it("prefers primaryType over secondary tags for a skating rink with a concession bar", () => {
      // Regression: roller skating rinks with a food/restaurant secondary
      // tag were being classified as RESTAURANT before primaryType was used.
      const types = [
        "roller_skating_rink",
        "point_of_interest",
        "food",
        "restaurant",
        "establishment",
      ];
      expect(mapGoogleTypeToCategory(types, "roller_skating_rink")).toBe("ACTIVITY");
    });

    it("uses primaryType=restaurant for an actual restaurant", () => {
      expect(
        mapGoogleTypeToCategory(["restaurant", "food", "point_of_interest"], "restaurant"),
      ).toBe("RESTAURANT");
    });

    it("falls back to the priority scan when primaryType is unknown", () => {
      expect(
        mapGoogleTypeToCategory(["bar", "night_club"], "some_future_unknown_type"),
      ).toBe("BAR");
    });

    it("falls back to the priority scan when primaryType is omitted", () => {
      expect(mapGoogleTypeToCategory(["restaurant", "bar"])).toBe("RESTAURANT");
    });

    it("maps newly-supported activity types", () => {
      expect(mapGoogleTypeToCategory([], "escape_room")).toBe("ACTIVITY");
      expect(mapGoogleTypeToCategory([], "arcade")).toBe("ACTIVITY");
      expect(mapGoogleTypeToCategory([], "axe_throwing")).toBe("ACTIVITY");
    });

    it("maps newly-supported event types", () => {
      expect(mapGoogleTypeToCategory([], "concert_hall")).toBe("EVENT");
      expect(mapGoogleTypeToCategory([], "comedy_club")).toBe("EVENT");
    });
  });

  describe("buildGooglePlacePhotoUrl", () => {
    it("builds a relative internal proxied photo URL from a photo reference", () => {
      expect(
        buildGooglePlacePhotoUrl("places/ChIJ_abc123/photos/ref123")
      ).toBe(
        "/api/places/photos?name=places%2FChIJ_abc123%2Fphotos%2Fref123&maxHeightPx=1200"
      );
    });

    it("returns null when a place has no photo reference", () => {
      expect(buildGooglePlacePhotoUrl(null)).toBeNull();
    });

    it("returns the same relative internal URL when app url is not configured", () => {
      vi.stubEnv("NEXT_PUBLIC_APP_URL", "");

      expect(
        buildGooglePlacePhotoUrl("places/ChIJ_abc123/photos/ref123")
      ).toBe(
        "/api/places/photos?name=places%2FChIJ_abc123%2Fphotos%2Fref123&maxHeightPx=1200"
      );
    });

    it("adds the sessionId query when photo cost attribution is needed", () => {
      expect(
        buildGooglePlacePhotoUrl("places/ChIJ_abc123/photos/ref123", "session-1")
      ).toBe(
        "/api/places/photos?name=places%2FChIJ_abc123%2Fphotos%2Fref123&maxHeightPx=1200&sessionId=session-1"
      );
    });
  });

  // ------------------------------------------------------------------
  // searchNearby
  // ------------------------------------------------------------------

  describe("searchNearby", () => {
    const location: Location = { lat: 30.2672, lng: -97.7431, label: "Austin" };

    it("maps a Google Places response to PlaceCandidate array", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          places: [
            {
              id: "ChIJ_abc123",
              displayName: { text: "Whisler's" },
              formattedAddress: "1816 E 6th St, Austin, TX",
              location: { latitude: 30.2609, longitude: -97.7267 },
              types: ["bar", "night_club"],
              priceLevel: "PRICE_LEVEL_MODERATE",
              rating: 4.5,
              userRatingCount: 1200,
              photos: [{ name: "places/ChIJ_abc123/photos/ref123" }],
            },
          ],
        }),
      });

      const results = await searchNearby(location, 2000, ["bar"], 3);

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        placeId: "ChIJ_abc123",
        name: "Whisler's",
        address: "1816 E 6th St, Austin, TX",
        location: { lat: 30.2609, lng: -97.7267, label: "Whisler's" },
        types: ["bar", "night_club"],
        primaryType: null,
        priceLevel: 2,
        rating: 4.5,
        reviewCount: 1200,
        photoReferences: [
          "places/ChIJ_abc123/photos/ref123",
        ],
        photoUrls: [
          "/api/places/photos?name=places%2FChIJ_abc123%2Fphotos%2Fref123&maxHeightPx=1200",
        ],
        photoReference: "places/ChIJ_abc123/photos/ref123",
      sourceType: "places" as const,
      });
    });

    it("keeps multiple Google photo references in order and maps them to proxied urls", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          places: [
            {
              id: "ChIJ_multi123",
              displayName: { text: "Cafe Bloom" },
              formattedAddress: "500 Congress Ave, Austin, TX",
              location: { latitude: 30.2677, longitude: -97.7429 },
              types: ["cafe", "restaurant"],
              priceLevel: "PRICE_LEVEL_MODERATE",
              rating: 4.7,
              userRatingCount: 803,
              photos: [
                { name: "places/ChIJ_multi123/photos/ref-a" },
                { name: "places/ChIJ_multi123/photos/ref-b" },
                { name: "places/ChIJ_multi123/photos/ref-c" },
              ],
            },
          ],
        }),
      });

      const results = await searchNearby(location, 2000, ["cafe"], 3);

      expect(results[0].photoReference).toBe("places/ChIJ_multi123/photos/ref-a");
      expect(results[0].photoReferences).toEqual([
        "places/ChIJ_multi123/photos/ref-a",
        "places/ChIJ_multi123/photos/ref-b",
        "places/ChIJ_multi123/photos/ref-c",
      ]);
      expect(results[0].photoUrls).toEqual([
        "/api/places/photos?name=places%2FChIJ_multi123%2Fphotos%2Fref-a&maxHeightPx=1200",
        "/api/places/photos?name=places%2FChIJ_multi123%2Fphotos%2Fref-b&maxHeightPx=1200",
        "/api/places/photos?name=places%2FChIJ_multi123%2Fphotos%2Fref-c&maxHeightPx=1200",
      ]);
    });

    it("maps Google price level strings to numeric values", async () => {
      const makePlaceWithPrice = (priceLevel: string) => ({
        places: [
          {
            id: "place1",
            displayName: { text: "Test" },
            formattedAddress: "123 St",
            location: { latitude: 30.0, longitude: -97.0 },
            types: ["restaurant"],
            priceLevel,
            rating: 4.0,
            userRatingCount: 100,
            photos: [],
          },
        ],
      });

      // PRICE_LEVEL_FREE → 0, INEXPENSIVE → 1, MODERATE → 2, EXPENSIVE → 3, VERY_EXPENSIVE → 4
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => makePlaceWithPrice("PRICE_LEVEL_INEXPENSIVE"),
      });
      const result1 = await searchNearby(location, 2000, ["restaurant"], 4);
      expect(result1[0].priceLevel).toBe(1);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => makePlaceWithPrice("PRICE_LEVEL_VERY_EXPENSIVE"),
      });
      const result2 = await searchNearby(location, 2000, ["restaurant"], 4);
      expect(result2[0].priceLevel).toBe(4);
    });

    it("handles missing optional fields gracefully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          places: [
            {
              id: "place_no_extras",
              displayName: { text: "Simple Cafe" },
              formattedAddress: "456 Oak Ave",
              location: { latitude: 30.27, longitude: -97.74 },
              types: ["cafe"],
              // no priceLevel, no photos, no userRatingCount
              rating: 3.8,
            },
          ],
        }),
      });

      const results = await searchNearby(location, 2000, ["cafe"], 3);

      expect(results).toHaveLength(1);
      expect(results[0].priceLevel).toBe(0);
      expect(results[0].reviewCount).toBe(0);
      expect(results[0].photoReference).toBeNull();
      expect(results[0].photoReferences).toEqual([]);
      expect(results[0].photoUrls).toEqual([]);
    });

    it("returns empty array when no results", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ places: [] }),
      });

      const results = await searchNearby(location, 2000, ["restaurant"], 3);

      expect(results).toEqual([]);
    });

    it("returns empty array when response has no places key", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const results = await searchNearby(location, 2000, ["restaurant"], 3);

      expect(results).toEqual([]);
    });

    it("throws when the API returns a non-OK response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: "Forbidden",
        text: async () => '{"error":{"message":"API key invalid","status":"PERMISSION_DENIED"}}',
      });

      await expect(
        searchNearby(location, 2000, ["restaurant"], 3)
      ).rejects.toThrow(
        'Google Places API error: 403 Forbidden - {"error":{"message":"API key invalid","status":"PERMISSION_DENIED"}}',
      );
    });

    it("keeps type filtering consistent when maxPrice is applied without sending unsupported request fields", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          places: [
            {
              id: "budget-ok",
              displayName: { text: "Budget Spot" },
              formattedAddress: "1 Main St",
              location: { latitude: 30.0, longitude: -97.0 },
              types: ["restaurant"],
              priceLevel: "PRICE_LEVEL_MODERATE",
              rating: 4.0,
              userRatingCount: 100,
              photos: [],
            },
            {
              id: "too-expensive",
              displayName: { text: "Fancy Spot" },
              formattedAddress: "2 Main St",
              location: { latitude: 30.0, longitude: -97.0 },
              types: ["restaurant"],
              priceLevel: "PRICE_LEVEL_VERY_EXPENSIVE",
              rating: 4.8,
              userRatingCount: 500,
              photos: [],
            },
          ],
        }),
      });

      const results = await searchNearby(location, 2000, ["restaurant", "bar"], 3);

      const [, request] = mockFetch.mock.calls[0] as [
        string,
        { body: string }
      ];
      const body = JSON.parse(request.body);

      expect(body.includedTypes).toEqual(["restaurant", "bar"]);
      expect(body).not.toHaveProperty("maxPriceLevel");
      expect(body).not.toHaveProperty("includedPrimaryTypes");
      expect(results.map((result) => result.placeId)).toEqual(["budget-ok"]);
    });

    it("excludes deny-listed venue types while keeping valid activity venues", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          places: [
            {
              id: "gym-1",
              displayName: { text: "Downtown Climbing Gym" },
              formattedAddress: "1 Fitness Way",
              location: { latitude: 30.0, longitude: -97.0 },
              types: ["gym", "point_of_interest", "establishment"],
              primaryType: "gym",
              rating: 4.6,
              userRatingCount: 300,
              photos: [],
            },
            {
              id: "liquor-1",
              displayName: { text: "Bottle Shop" },
              formattedAddress: "2 Spirits Ave",
              location: { latitude: 30.0, longitude: -97.0 },
              types: ["liquor_store", "store", "point_of_interest"],
              primaryType: "liquor_store",
              rating: 4.2,
              userRatingCount: 120,
              photos: [],
            },
            {
              id: "rink-1",
              displayName: { text: "Moonlight Roller Rink" },
              formattedAddress: "3 Date Night Dr",
              location: { latitude: 30.0, longitude: -97.0 },
              types: ["roller_skating_rink", "point_of_interest", "restaurant"],
              primaryType: "roller_skating_rink",
              rating: 4.7,
              userRatingCount: 410,
              photos: [],
            },
          ],
        }),
      });

      const results = await searchNearby(location, 2000, ["restaurant", "activity"], 4);

      expect(results.map((result) => result.placeId)).toEqual(["rink-1"]);
    });

    it("excludes fast-food venues by type first, then by generic chain-name fallback", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          places: [
            {
              id: "fast-food-1",
              displayName: { text: "McDonald's" },
              formattedAddress: "4 Chain Ln",
              location: { latitude: 30.0, longitude: -97.0 },
              types: ["restaurant", "food", "point_of_interest"],
              primaryType: "restaurant",
              rating: 3.9,
              userRatingCount: 1200,
              photos: [],
            },
            {
              id: "fast-food-typed",
              displayName: { text: "Quick Bites" },
              formattedAddress: "4 Food Ct",
              location: { latitude: 30.0, longitude: -97.0 },
              types: ["fast_food_restaurant", "restaurant", "food"],
              primaryType: "fast_food_restaurant",
              rating: 4.2,
              userRatingCount: 430,
              photos: [],
            },
            {
              id: "fast-food-2",
              displayName: { text: "Jollibee" },
              formattedAddress: "4 Joy Ave",
              location: { latitude: 30.0, longitude: -97.0 },
              types: ["restaurant", "food", "point_of_interest"],
              primaryType: "restaurant",
              rating: 4.1,
              userRatingCount: 980,
              photos: [],
            },
            {
              id: "cafe-1",
              displayName: { text: "Morning Bloom Cafe" },
              formattedAddress: "5 Slow Date St",
              location: { latitude: 30.0, longitude: -97.0 },
              types: ["cafe", "restaurant", "food"],
              primaryType: "cafe",
              rating: 4.6,
              userRatingCount: 210,
              photos: [],
            },
            {
              id: "bistro-1",
              displayName: { text: "Corner Bistro" },
              formattedAddress: "6 Slow Date St",
              location: { latitude: 30.0, longitude: -97.0 },
              types: ["restaurant", "food"],
              primaryType: "restaurant",
              rating: 4.5,
              userRatingCount: 340,
              photos: [],
            },
          ],
        }),
      });

      const results = await searchNearby(location, 2000, ["restaurant"], 2);

      expect(results.map((result) => result.placeId)).toEqual([
        "cafe-1",
        "bistro-1",
      ]);
    });

    it("excludes fast-food venues by Google type even when they also look like restaurants", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          places: [
            {
              id: "fast-food-2",
              displayName: { text: "Jollibee" },
              formattedAddress: "6 Chain Ln",
              location: { latitude: 30.0, longitude: -97.0 },
              types: [
                "chicken_restaurant",
                "fast_food_restaurant",
                "restaurant",
                "food",
              ],
              primaryType: "fast_food_restaurant",
              rating: 4.4,
              userRatingCount: 900,
              photos: [],
            },
            {
              id: "restaurant-1",
              displayName: { text: "Cafe Magnolia" },
              formattedAddress: "7 Date St",
              location: { latitude: 30.0, longitude: -97.0 },
              types: ["restaurant", "cafe", "food"],
              primaryType: "restaurant",
              rating: 4.6,
              userRatingCount: 320,
              photos: [],
            },
          ],
        }),
      });

      const results = await searchNearby(location, 2000, ["restaurant"], 4);

      expect(results.map((result) => result.placeId)).toEqual(["restaurant-1"]);
    });
  });
});

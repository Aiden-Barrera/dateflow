import { describe, it, expect, vi, beforeEach } from "vitest";
import {
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
        priceLevel: 2,
        rating: 4.5,
        reviewCount: 1200,
        photoReference: "places/ChIJ_abc123/photos/ref123",
      });
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
        text: async () => "API key invalid",
      });

      await expect(
        searchNearby(location, 2000, ["restaurant"], 3)
      ).rejects.toThrow("Google Places API error: 403 Forbidden");
    });

    it("keeps type filtering consistent when maxPrice is applied", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ places: [] }),
      });

      await searchNearby(location, 2000, ["restaurant", "bar"], 3);

      const [, request] = mockFetch.mock.calls[0] as [
        string,
        { body: string }
      ];
      const body = JSON.parse(request.body);

      expect(body.includedTypes).toEqual(["restaurant", "bar"]);
      expect(body.maxPriceLevel).toBe(3);
      expect(body).not.toHaveProperty("includedPrimaryTypes");
    });
  });
});

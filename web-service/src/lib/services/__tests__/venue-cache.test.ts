import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { VenueCache } from "../venue-cache";
import type { PlaceCandidate } from "../../types/venue";
import type { Category } from "../../types/preference";

// Mock the Upstash Redis client
vi.mock("../../upstash-redis", () => ({
  getRedisClient: vi.fn(),
}));

import { getRedisClient } from "../../upstash-redis";

describe("VenueCache", () => {
  let cache: VenueCache;
  let mockRedisClient: { get: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn> };

  function makeCandidate(overrides: Partial<PlaceCandidate> = {}): PlaceCandidate {
    return {
      placeId: "place1",
      name: "Cafe",
      address: "456 Oak Ave",
      location: { lat: 30.2672, lng: -97.7431, label: "Austin" },
      types: ["cafe"],
      priceLevel: 1,
      rating: 4.0,
      reviewCount: 50,
      photoReference: null,
      sourceType: "places" as const,
      photoReferences: [],
      photoUrls: [],
      ...overrides,
    };
  }

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // Create a mock Redis client
    mockRedisClient = {
      get: vi.fn(),
      set: vi.fn(),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(getRedisClient).mockReturnValue(mockRedisClient as any);
    cache = new VenueCache();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("buildKey", () => {
    it("builds a consistent key from location, categories, and price level", () => {
      const location = { lat: 30.2672, lng: -97.7431, label: "Austin, TX" };
      const categories: readonly Category[] = ["RESTAURANT", "BAR"];
      const priceLevel = 2;

      const key1 = cache.buildKey(location, categories, priceLevel);
      const key2 = cache.buildKey(location, categories, priceLevel);

      expect(key1).toBe(key2);
      expect(key1).toContain("30.27"); // Rounded coordinates
      expect(key1).toContain("-97.74");
    });

    it("sorts categories so different orderings produce the same key", () => {
      const location = { lat: 30.2672, lng: -97.7431, label: "Austin, TX" };
      const categories1: readonly Category[] = ["RESTAURANT", "BAR"];
      const categories2: readonly Category[] = ["BAR", "RESTAURANT"];
      const priceLevel = 2;

      const key1 = cache.buildKey(location, categories1, priceLevel);
      const key2 = cache.buildKey(location, categories2, priceLevel);

      expect(key1).toBe(key2);
    });

    it("produces different keys for different locations", () => {
      const location1 = { lat: 30.2672, lng: -97.7431, label: "Austin, TX" };
      const location2 = { lat: 37.7749, lng: -122.4194, label: "San Francisco, CA" };
      const categories: readonly Category[] = ["RESTAURANT"];
      const priceLevel = 2;

      const key1 = cache.buildKey(location1, categories, priceLevel);
      const key2 = cache.buildKey(location2, categories, priceLevel);

      expect(key1).not.toBe(key2);
    });

    it("produces different keys for different price levels", () => {
      const location = { lat: 30.2672, lng: -97.7431, label: "Austin, TX" };
      const categories: readonly Category[] = ["RESTAURANT"];

      const key1 = cache.buildKey(location, categories, 1);
      const key2 = cache.buildKey(location, categories, 3);

      expect(key1).not.toBe(key2);
    });
  });

  describe("set and get", () => {
    it("stores candidates and retrieves them", async () => {
      const key = "test:venue:cache:key";
      const candidates: PlaceCandidate[] = [
        makeCandidate({
          name: "Restaurant A",
          address: "123 Main St",
          types: ["restaurant"],
          priceLevel: 2,
          rating: 4.5,
          reviewCount: 150,
          photoReference: "photo123",
      sourceType: "places" as const,
          photoReferences: ["photo123"],
        }),
      ];
      const ttl = 3600;

      mockRedisClient.set.mockResolvedValue("OK");
      mockRedisClient.get.mockResolvedValue(JSON.stringify(candidates));

      await cache.set(key, candidates, ttl);
      const retrieved = await cache.get(key);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        key,
        JSON.stringify(candidates),
        { ex: ttl }
      );
      expect(retrieved).toEqual(candidates);
    });

    it("returns null when key doesn't exist", async () => {
      const key = "nonexistent:key";

      mockRedisClient.get.mockResolvedValue(null);

      const result = await cache.get(key);

      expect(result).toBeNull();
    });

    it("parses JSON candidates from Redis", async () => {
      const key = "test:key";
      const candidates: PlaceCandidate[] = [makeCandidate()];

      mockRedisClient.get.mockResolvedValue(JSON.stringify(candidates));

      const retrieved = await cache.get(key);

      expect(retrieved).toEqual(candidates);
    });

    it("returns already-materialized cached arrays without reparsing", async () => {
      const key = "test:key";
      const candidates: PlaceCandidate[] = [makeCandidate()];

      mockRedisClient.get.mockResolvedValue(candidates);

      const retrieved = await cache.get(key);

      expect(retrieved).toEqual(candidates);
    });
  });

  describe("error handling", () => {
    it("returns null when Redis get throws an error", async () => {
      const key = "test:key";

      mockRedisClient.get.mockRejectedValue(new Error("Redis connection failed"));

      const result = await cache.get(key);

      expect(result).toBeNull();
    });

    it("logs error and continues when Redis set throws", async () => {
      const key = "test:key";
      const candidates: PlaceCandidate[] = [];
      const ttl = 3600;

      mockRedisClient.set.mockRejectedValue(new Error("Redis write failed"));

      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await cache.set(key, candidates, ttl);

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it("handles invalid JSON from Redis gracefully", async () => {
      const key = "test:key";

      mockRedisClient.get.mockResolvedValue("invalid json {]");

      const result = await cache.get(key);

      expect(result).toBeNull();
    });
  });
});

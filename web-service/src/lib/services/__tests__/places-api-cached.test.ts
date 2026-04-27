import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PlaceCandidate } from "../../types/venue";
import type { Location, Category } from "../../types/preference";

// Mock the two dependencies: VenueCache and searchNearby
vi.mock("../venue-cache", () => {
  const mockCache = {
    buildKey: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
  };
  return { VenueCache: vi.fn(function () { return mockCache; }) };
});

vi.mock("../places-api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../places-api-client")>();
  return {
    ...actual,
    searchNearby: vi.fn(),
  };
});

// Import AFTER mocks are set up
import { searchNearbyWithCache, CACHE_TTL_SECONDS } from "../places-api-cached";
import { VenueCache } from "../venue-cache";
import { searchNearby } from "../places-api-client";

describe("searchNearbyWithCache", () => {
  const location: Location = { lat: 30.2672, lng: -97.7431, label: "Austin" };
  const categories: Category[] = ["RESTAURANT", "BAR"];
  const radius = 2000;
  const maxPrice = 3;

  const fakeCandidates: readonly PlaceCandidate[] = [
    {
      placeId: "ChIJ_abc",
      name: "Test Venue",
      address: "123 Main St",
      location: { lat: 30.26, lng: -97.73, label: "Test Venue" },
      types: ["restaurant"],
      primaryType: null,
      priceLevel: 2,
      rating: 4.5,
      reviewCount: 200,
      photoReferences: ["photo_ref_1"],
      photoReference: "photo_ref_1",
      sourceType: "places" as const,
      photoUrls: [],
    },
  ];

  let mockCache: {
    buildKey: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Get the mock cache instance that VenueCache constructor returns
    mockCache = new VenueCache() as unknown as typeof mockCache;
    mockCache.buildKey.mockReturnValue("venue:cache:v3:30.27:-97.74:BAR:RESTAURANT:3");
  });

  it("returns cached results on cache hit (no API call)", async () => {
    mockCache.get.mockResolvedValueOnce(fakeCandidates);

    const results = await searchNearbyWithCache(location, radius, categories, maxPrice);

    expect(results).toEqual(fakeCandidates);
    expect(mockCache.get).toHaveBeenCalledWith("venue:cache:v3:30.27:-97.74:BAR:RESTAURANT:3:radius=2000");
    expect(searchNearby).not.toHaveBeenCalled();
  });

  it("calls API and caches results on cache miss", async () => {
    mockCache.get.mockResolvedValueOnce(null);
    vi.mocked(searchNearby).mockResolvedValueOnce([
      fakeCandidates[0],
      {
        ...fakeCandidates[0],
        placeId: "chain-1",
        name: "Jollibee",
        types: ["restaurant", "food"],
        primaryType: "restaurant",
      },
    ]);
    mockCache.set.mockResolvedValueOnce(undefined);

    const results = await searchNearbyWithCache(location, radius, categories, maxPrice);

    expect(results).toEqual(fakeCandidates);
    // searchNearby receives Google type strings, not Category enums
    const expectedGoogleTypes = ["restaurant", "cafe", "bakery", "bar", "night_club"];
    expect(searchNearby).toHaveBeenCalledWith(location, radius, expectedGoogleTypes, maxPrice);
    expect(mockCache.set).toHaveBeenCalledWith(
      "venue:cache:v3:30.27:-97.74:BAR:RESTAURANT:3:radius=2000",
      fakeCandidates,
      CACHE_TTL_SECONDS
    );
  });

  it("filters stale cached candidates on cache hit before returning them", async () => {
    mockCache.get.mockResolvedValueOnce([
      {
        ...fakeCandidates[0],
        placeId: "chain-1",
        name: "McDonald's",
        types: ["restaurant", "food"],
        primaryType: "restaurant",
      },
      {
        ...fakeCandidates[0],
        placeId: "gym-1",
        name: "City Gym",
        types: ["gym", "point_of_interest"],
        primaryType: "gym",
      },
      {
        ...fakeCandidates[0],
        placeId: "good-1",
        name: "Neighborhood Cafe",
        types: ["cafe", "restaurant"],
        primaryType: "cafe",
      },
    ] satisfies readonly PlaceCandidate[]);

    const results = await searchNearbyWithCache(location, radius, categories, maxPrice);

    expect(results.map((candidate) => candidate.placeId)).toEqual(["good-1"]);
    expect(searchNearby).not.toHaveBeenCalled();
  });

  it("passes correct TTL to cache (6 hours)", () => {
    expect(CACHE_TTL_SECONDS).toBe(21_600);
  });

  it("calls API when cache.get throws an error", async () => {
    mockCache.get.mockRejectedValueOnce(new Error("Redis down"));
    vi.mocked(searchNearby).mockResolvedValueOnce(fakeCandidates);
    mockCache.set.mockResolvedValueOnce(undefined);

    const results = await searchNearbyWithCache(location, radius, categories, maxPrice);

    expect(results).toEqual(fakeCandidates);
    expect(searchNearby).toHaveBeenCalled();
  });

  it("does not write to cache when the API returns no candidates", async () => {
    mockCache.get.mockResolvedValueOnce(null);
    vi.mocked(searchNearby).mockResolvedValueOnce([]);

    const results = await searchNearbyWithCache(location, radius, categories, maxPrice);

    expect(results).toEqual([]);
    expect(mockCache.set).not.toHaveBeenCalled();
  });

  it("calls API without caching when cache initialization throws", async () => {
    vi.mocked(VenueCache).mockImplementationOnce(() => {
      throw new Error("Missing Upstash env");
    });
    vi.mocked(searchNearby).mockResolvedValueOnce(fakeCandidates);

    const results = await searchNearbyWithCache(location, radius, categories, maxPrice);

    expect(results).toEqual(fakeCandidates);
    expect(searchNearby).toHaveBeenCalledWith(
      location,
      radius,
      ["restaurant", "cafe", "bakery", "bar", "night_club"],
      maxPrice
    );
    expect(mockCache.get).not.toHaveBeenCalled();
    expect(mockCache.set).not.toHaveBeenCalled();
  });
});

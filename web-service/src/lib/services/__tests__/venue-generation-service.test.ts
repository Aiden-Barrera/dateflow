import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateVenues } from "../venue-generation-service";
import type { Preference } from "../../types/preference";
import type { CuratedVenueCandidate, VenueRow } from "../../types/venue";

const mockQueryOrderPosition = vi.fn();
const mockQueryOrderRound = vi.fn(() => ({
  order: mockQueryOrderPosition,
}));
const mockQueryEq = vi.fn(() => ({
  order: mockQueryOrderRound,
}));
const mockQuerySelect = vi.fn(() => ({
  eq: mockQueryEq,
}));

const mockInsertSelectSingle = vi.fn();
const mockInsertSelect = vi.fn(() => ({ single: mockInsertSelectSingle }));
const mockInsert = vi.fn(() => ({ select: mockInsertSelect }));
const mockUpsert = vi.fn();

const mockUpdateSelect = vi.fn();
const mockUpdateIn = vi.fn(() => ({ select: mockUpdateSelect }));
const mockUpdateEqStatus = vi.fn(() => ({ select: mockUpdateSelect }));
const mockUpdateEqId = vi.fn(() => ({
  eq: mockUpdateEqStatus,
  in: mockUpdateIn,
}));
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEqId }));

const mockFrom = vi.fn((table: string) => {
  if (table === "sessions") {
    return { update: mockUpdate };
  }

  if (table === "session_candidate_pools" || table === "venue_generation_batches") {
    return { insert: mockInsert };
  }

  return {
    select: mockQuerySelect,
    upsert: mockUpsert,
  };
});

vi.mock("../../supabase-server", () => ({
  getSupabaseServerClient: () => ({ from: mockFrom }),
}));

const mockGetBothPreferences = vi.fn();
vi.mock("../preference-service", () => ({
  getBothPreferences: (...args: unknown[]) => mockGetBothPreferences(...args),
}));

const mockCalculateMidpoint = vi.fn();
vi.mock("../midpoint-calculator", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../midpoint-calculator")>();
  return {
    ...actual,
    calculateMidpoint: (...args: unknown[]) => mockCalculateMidpoint(...args),
  };
});

const mockSearchNearbyWithCache = vi.fn();
vi.mock("../places-api-cached", () => ({
  searchNearbyWithCache: (...args: unknown[]) => mockSearchNearbyWithCache(...args),
}));

const mockApplySafetyFilter = vi.fn();
vi.mock("../safety-filter", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../safety-filter")>();
  return {
    ...actual,
    applySafetyFilter: (...args: unknown[]) => mockApplySafetyFilter(...args),
  };
});

const mockScoreAndCurate = vi.fn();
vi.mock("../ai-curation-service", () => ({
  scoreAndCurate: (...args: unknown[]) => mockScoreAndCurate(...args),
}));

const mockFetchLiveEventCandidates = vi.fn();
vi.mock("../event-enrichment-service", () => ({
  fetchLiveEventCandidates: (...args: unknown[]) =>
    mockFetchLiveEventCandidates(...args),
}));

vi.mock("../sponsored-venue-service", () => ({
  fetchActiveSponsoredBoosts: vi.fn().mockResolvedValue(new Map()),
  fetchPopularityBoosts: vi.fn().mockResolvedValue(new Map()),
}));

const preferences: readonly [Preference, Preference] = [
  {
    id: "pref-a",
    sessionId: "session-1",
    role: "a",
    location: { lat: 30.28, lng: -97.74, label: "North" },
    budget: "MODERATE",
    categories: ["RESTAURANT", "BAR"],
    createdAt: new Date("2026-04-01T10:00:00Z"),
  },
  {
    id: "pref-b",
    sessionId: "session-1",
    role: "b",
    location: { lat: 30.25, lng: -97.75, label: "South" },
    budget: "BUDGET",
    categories: ["RESTAURANT", "ACTIVITY"],
    createdAt: new Date("2026-04-01T10:01:00Z"),
  },
];

const originalGooglePlacesApiKey = process.env.GOOGLE_PLACES_API_KEY;
const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;

function makeCuratedVenue(index: number): CuratedVenueCandidate {
  return {
    placeId: `place-${index}`,
    name: `Venue ${index}`,
    address: `${index} Main St`,
    location: { lat: 30.26 + index / 1000, lng: -97.74, label: `Venue ${index}` },
    types: ["restaurant"],
    category: index % 2 === 0 ? "RESTAURANT" : "ACTIVITY",
    priceLevel: 1,
    rating: 4.5,
    reviewCount: 200 + index,
    photoReference:
      index % 2 === 0 ? `places/place-${index}/photos/photo-${index}` : null,
      sourceType: "places" as const,
    photoReferences:
      index % 2 === 0
        ? [
            `places/place-${index}/photos/photo-${index}`,
            `places/place-${index}/photos/photo-${index}-b`,
          ]
        : [],
    photoUrls:
      index % 2 === 0
        ? [
            `/api/places/photos?name=places%2Fplace-${index}%2Fphotos%2Fphoto-${index}&maxHeightPx=1200`,
            `/api/places/photos?name=places%2Fplace-${index}%2Fphotos%2Fphoto-${index}-b&maxHeightPx=1200`,
          ]
        : [],
    tags: ["unscored"],
    score: {
      categoryOverlap: 1,
      distanceToMidpoint: 0.9,
      firstDateSuitability: 0.8,
      qualitySignal: 0.85,
      timeOfDayFit: 0.9,
      composite: 0.89 - index / 100,
    },
  };
}

function makeVenueRow(index: number): VenueRow {
  const round = Math.floor(index / 4) + 1;
  const position = (index % 4) + 1;

  return {
    id: `venue-${index + 1}`,
    session_id: "session-1",
    place_id: `place-${index + 1}`,
    name: `Venue ${index + 1}`,
    category: index % 2 === 0 ? "RESTAURANT" : "ACTIVITY",
    address: `${index + 1} Main St`,
    lat: 30.26 + index / 1000,
    lng: -97.74,
    price_level: 1,
    rating: 4.5,
    photo_urls: null,
    photo_url: null,
    tags: ["unscored"],
    round,
    position,
    score_category_overlap: 1,
    score_distance_to_midpoint: 0.9,
    score_first_date_suitability: 0.8,
    score_quality_signal: 0.85,
    score_time_of_day_fit: 0.9,
  };
}

describe("generateVenues", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GOOGLE_PLACES_API_KEY = "test-api-key";
    process.env.NEXT_PUBLIC_APP_URL = "https://dateflow.test";
    mockGetBothPreferences.mockResolvedValue(preferences);
    mockCalculateMidpoint.mockReturnValue({
      lat: 30.265,
      lng: -97.745,
      label: "Midpoint",
    });

    const curated = Array.from({ length: 12 }, (_, index) => makeCuratedVenue(index + 1));
    mockSearchNearbyWithCache.mockResolvedValue(curated);
    mockApplySafetyFilter.mockImplementation((candidates: unknown) => candidates);
    mockFetchLiveEventCandidates.mockResolvedValue([]);
    mockScoreAndCurate
      .mockResolvedValueOnce(curated.slice(0, 4))
      .mockResolvedValueOnce(curated.slice(4, 8))
      .mockResolvedValueOnce(curated.slice(8, 12));

    mockInsertSelectSingle
      .mockResolvedValueOnce({
        data: { id: "pool-1" },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { id: "batch-1" },
        error: null,
      });
    mockUpsert.mockResolvedValue({ error: null });
    mockUpdateSelect.mockResolvedValue({ data: [{ id: "session-1" }], error: null });
    mockQueryOrderPosition.mockResolvedValue({
      data: Array.from({ length: 12 }, (_, index) => makeVenueRow(index)),
      error: null,
    });
  });

  afterEach(() => {
    process.env.GOOGLE_PLACES_API_KEY = originalGooglePlacesApiKey;
    process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
  });

  it("generates, saves, and returns 12 venues across 3 rounds", async () => {
    const venues = await generateVenues("session-1");

    expect(mockGetBothPreferences).toHaveBeenCalledWith("session-1");
    expect(mockSearchNearbyWithCache).toHaveBeenCalledWith(
      { lat: 30.265, lng: -97.745, label: "Midpoint" },
      2000,
      ["RESTAURANT", "BAR", "ACTIVITY"],
      1,
      "session-1"
    );
    expect(mockScoreAndCurate).toHaveBeenCalledTimes(3);
    expect(mockInsert).toHaveBeenNthCalledWith(1, {
      session_id: "session-1",
      source: "initial_generation",
    });
    expect(mockInsert).toHaveBeenNthCalledWith(2, {
      session_id: "session-1",
      pool_id: "pool-1",
      batch_number: 1,
      generation_strategy: "initial_pool_rank",
    });
    expect(mockUpsert).toHaveBeenCalledTimes(2);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.any(Array),
      { onConflict: "pool_id,place_id" }
    );
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.any(Array),
      { onConflict: "session_id,round,position" }
    );

    const candidatePoolRows = mockUpsert.mock.calls[0][0];
    expect(candidatePoolRows).toHaveLength(12);
    expect(candidatePoolRows[0].pool_id).toBe("pool-1");
    expect(candidatePoolRows[0].source_rank).toBe(1);
    expect(candidatePoolRows[0].photo_url).toBeNull();
    expect(candidatePoolRows[0].photo_urls).toEqual([]);
    expect(candidatePoolRows[1].photo_url).toBe(
      "/api/places/photos?name=places%2Fplace-2%2Fphotos%2Fphoto-2&maxHeightPx=1200&sessionId=session-1"
    );
    expect(candidatePoolRows[1].photo_urls).toEqual([
      "/api/places/photos?name=places%2Fplace-2%2Fphotos%2Fphoto-2&maxHeightPx=1200&sessionId=session-1",
      "/api/places/photos?name=places%2Fplace-2%2Fphotos%2Fphoto-2-b&maxHeightPx=1200&sessionId=session-1",
    ]);

    const insertedRows = mockUpsert.mock.calls[1][0];
    expect(insertedRows).toHaveLength(12);
    expect(insertedRows[0].round).toBe(1);
    expect(insertedRows[0].position).toBe(1);
    expect(insertedRows[0].generation_batch_id).toBe("batch-1");
    expect(insertedRows[0].surfaced_cycle).toBe(1);
    expect(insertedRows[0].photo_url).toBeNull();
    expect(insertedRows[0].photo_urls).toEqual([]);
    expect(insertedRows[1].photo_url).toBe(
      "/api/places/photos?name=places%2Fplace-2%2Fphotos%2Fphoto-2&maxHeightPx=1200&sessionId=session-1"
    );
    expect(insertedRows[1].photo_urls).toEqual([
      "/api/places/photos?name=places%2Fplace-2%2Fphotos%2Fphoto-2&maxHeightPx=1200&sessionId=session-1",
      "/api/places/photos?name=places%2Fplace-2%2Fphotos%2Fphoto-2-b&maxHeightPx=1200&sessionId=session-1",
    ]);
    expect(insertedRows[4].round).toBe(2);
    expect(insertedRows[8].round).toBe(3);

    expect(mockUpdate).toHaveBeenNthCalledWith(1, { status: "generating" });
    expect(mockUpdate).toHaveBeenNthCalledWith(2, { status: "ready_to_swipe" });
    expect(mockUpdateIn).toHaveBeenCalledWith("status", [
      "both_ready",
      "generation_failed",
    ]);
    expect(venues).toHaveLength(12);
    expect(venues[0].score.composite).toBeDefined();
  });

  it("marks the session as generation_failed when the pipeline throws", async () => {
    mockSearchNearbyWithCache.mockRejectedValueOnce(new Error("Places down"));

    await expect(generateVenues("session-1")).rejects.toThrow("Places down");

    expect(mockUpdate).toHaveBeenNthCalledWith(1, { status: "generating" });
    expect(mockUpdate).toHaveBeenNthCalledWith(2, { status: "generation_failed" });
  });

  it("allows retries when the session starts in generation_failed", async () => {
    await generateVenues("session-1");

    expect(mockUpdateIn).toHaveBeenCalledWith("status", [
      "both_ready",
      "generation_failed",
    ]);
  });

  it("fetches live events and merges them into the candidate pool when categories include ACTIVITY", async () => {
    const eventPreferences: readonly [typeof preferences[0], typeof preferences[1]] = [
      { ...preferences[0], categories: ["RESTAURANT", "ACTIVITY"] },
      { ...preferences[1], categories: ["ACTIVITY"] },
    ];
    mockGetBothPreferences.mockResolvedValue(eventPreferences);

    const liveEventCandidate = makeCuratedVenue(99);
    mockFetchLiveEventCandidates.mockResolvedValueOnce([liveEventCandidate]);

    await generateVenues("session-1");

    expect(mockFetchLiveEventCandidates).toHaveBeenCalledTimes(1);
  });

  it("does not fetch live events when categories have no ACTIVITY or EVENT", async () => {
    const restaurantOnlyPreferences: readonly [typeof preferences[0], typeof preferences[1]] = [
      { ...preferences[0], categories: ["RESTAURANT", "BAR"] },
      { ...preferences[1], categories: ["RESTAURANT"] },
    ];
    mockGetBothPreferences.mockResolvedValue(restaurantOnlyPreferences);

    await generateVenues("session-1");

    expect(mockFetchLiveEventCandidates).not.toHaveBeenCalled();
  });

  it("expands the search radius when the first tier returns too few safe candidates", async () => {
    const few = [makeCuratedVenue(1)]; // 1 < MIN_CANDIDATES_TO_PROCEED (12)
    const enough = Array.from({ length: 12 }, (_, i) => makeCuratedVenue(i + 1));

    // First call (2 km) → too few; second call (5 km) → enough
    mockSearchNearbyWithCache
      .mockResolvedValueOnce(few)
      .mockResolvedValue(enough);

    // Safety filter passes everything through
    mockApplySafetyFilter.mockImplementation((candidates: unknown) => candidates);

    await generateVenues("session-1");

    expect(mockSearchNearbyWithCache).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      2000,
      expect.anything(),
      expect.anything(),
      "session-1"
    );
    expect(mockSearchNearbyWithCache).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      5000,
      expect.anything(),
      expect.anything(),
      "session-1"
    );
    // Should not expand further once we have enough
    expect(mockSearchNearbyWithCache).toHaveBeenCalledTimes(2);
  });

  it("searches around both users when midpoint radius expansion is still sparse", async () => {
    const sparse = [makeCuratedVenue(1)];
    const userAResults = Array.from({ length: 6 }, (_, index) => makeCuratedVenue(index + 1));
    const userBResults = Array.from({ length: 6 }, (_, index) => makeCuratedVenue(index + 7));

    mockSearchNearbyWithCache
      .mockResolvedValueOnce(sparse)
      .mockResolvedValueOnce(sparse)
      .mockResolvedValueOnce(sparse)
      .mockResolvedValueOnce(sparse)
      .mockResolvedValueOnce(userAResults)
      .mockResolvedValueOnce(userBResults);
    mockApplySafetyFilter.mockImplementation((candidates: unknown) => candidates);

    await generateVenues("session-1");

    expect(mockSearchNearbyWithCache).toHaveBeenNthCalledWith(
      5,
      preferences[0].location,
      5000,
      ["RESTAURANT", "BAR", "ACTIVITY"],
      1,
      "session-1",
    );
    expect(mockSearchNearbyWithCache).toHaveBeenNthCalledWith(
      6,
      preferences[1].location,
      5000,
      ["RESTAURANT", "BAR", "ACTIVITY"],
      1,
      "session-1",
    );
    expect(mockUpdate).toHaveBeenLastCalledWith({ status: "ready_to_swipe" });
  });

  it("generates a smaller swipe deck instead of failing when some safe candidates exist", async () => {
    const smallPool = Array.from({ length: 6 }, (_, index) => makeCuratedVenue(index + 1));
    mockSearchNearbyWithCache.mockResolvedValue(smallPool);
    mockApplySafetyFilter.mockImplementation((candidates: unknown) => candidates);
    mockScoreAndCurate.mockReset();
    mockScoreAndCurate
      .mockResolvedValueOnce(smallPool.slice(0, 4))
      .mockResolvedValueOnce(smallPool.slice(4, 6))
      .mockResolvedValueOnce([]);

    await generateVenues("session-1");

    const insertedRows = mockUpsert.mock.calls[1][0];
    expect(insertedRows).toHaveLength(6);
    expect(insertedRows[0].round).toBe(1);
    expect(insertedRows[4].round).toBe(2);
    expect(mockUpdate).toHaveBeenLastCalledWith({ status: "ready_to_swipe" });
  });

  it("throws and sets generation_failed when all radii return no safe candidates", async () => {
    mockSearchNearbyWithCache.mockResolvedValue([]);
    mockApplySafetyFilter.mockReturnValue([]);
    mockFetchLiveEventCandidates.mockResolvedValue([]);

    await expect(generateVenues("session-1")).rejects.toThrow(
      "Not enough venues found near your midpoint"
    );

    // Should have tried all 4 midpoint radius tiers plus both user-centered fallback searches.
    expect(mockSearchNearbyWithCache).toHaveBeenCalledTimes(6);
    expect(mockSearchNearbyWithCache).toHaveBeenNthCalledWith(
      5,
      preferences[0].location,
      5000,
      ["RESTAURANT", "BAR", "ACTIVITY"],
      1,
      "session-1",
    );
    expect(mockSearchNearbyWithCache).toHaveBeenNthCalledWith(
      6,
      preferences[1].location,
      5000,
      ["RESTAURANT", "BAR", "ACTIVITY"],
      1,
      "session-1",
    );

    // Final status update must be generation_failed (not ready_to_swipe)
    expect(mockUpdate).toHaveBeenLastCalledWith({ status: "generation_failed" });
  });
});

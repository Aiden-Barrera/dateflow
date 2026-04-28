import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Preference } from "../../types/preference";
import type { PlaceCandidate } from "../../types/venue";

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

const mockScoreAndCurate = vi.fn();
vi.mock("../ai-curation-service", () => ({
  scoreAndCurate: (...args: unknown[]) => mockScoreAndCurate(...args),
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
    budget: "MODERATE",
    categories: ["RESTAURANT", "BAR"],
    createdAt: new Date("2026-04-01T10:01:00Z"),
  },
];

const originalGooglePlacesApiKey = process.env.GOOGLE_PLACES_API_KEY;
const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;

function makeCandidate(overrides: Partial<PlaceCandidate & { category: string; tags: readonly string[]; score: Record<string, number> }> = {}): PlaceCandidate {
  return {
    placeId: "place-1",
    name: "Default Venue",
    address: "1 Main St",
    location: { lat: 30.26, lng: -97.74, label: "Venue" },
    types: ["restaurant"],
    priceLevel: 2,
    rating: 4.6,
    reviewCount: 250,
    photoReference: null,
      sourceType: "places" as const,
    photoReferences: [],
    photoUrls: [],
    category: "RESTAURANT",
    tags: [],
    score: {
      categoryOverlap: 1,
      distanceToMidpoint: 0.9,
      firstDateSuitability: 0.85,
      qualitySignal: 0.9,
      timeOfDayFit: 0.8,
      composite: 0.89,
    },
    ...overrides,
  } as PlaceCandidate & {
    readonly category: "RESTAURANT" | "BAR" | "EVENT" | "ACTIVITY";
    readonly tags: readonly string[];
    readonly score: {
      readonly categoryOverlap: number;
      readonly distanceToMidpoint: number;
      readonly firstDateSuitability: number;
      readonly qualitySignal: number;
      readonly timeOfDayFit: number;
      readonly composite: number;
    };
  };
}

describe("generateVenues category intent", () => {
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

    // 12 restaurant candidates (pass safety filter for RESTAURANT/BAR prefs)
    // plus one spillover museum that should be filtered out by the safety filter.
    // MIN_CANDIDATES_TO_PROCEED = VENUES_PER_ROUND * FINAL_ROUND = 12, so we
    // need all 12 restaurants to remain after filtering.
    const restaurantCandidates = Array.from({ length: 12 }, (_, i) =>
      makeCandidate({
        placeId: `restaurant-${i + 1}`,
        name: `Restaurant ${i + 1}`,
        types: ["restaurant", "food", "point_of_interest", "establishment"],
      }),
    );
    const spilloverMuseum = makeCandidate({
      placeId: "museum-1",
      name: "Spillover Museum",
      types: ["museum", "point_of_interest", "establishment"],
      category: "ACTIVITY",
    });

    mockSearchNearbyWithCache.mockResolvedValue([...restaurantCandidates, spilloverMuseum]);
    mockScoreAndCurate
      .mockResolvedValueOnce(restaurantCandidates.slice(0, 4))
      .mockResolvedValueOnce(restaurantCandidates.slice(4, 8))
      .mockResolvedValueOnce(restaurantCandidates.slice(8, 12));

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
    mockQueryOrderPosition.mockResolvedValue({ data: [], error: null });
  });

  afterEach(() => {
    process.env.GOOGLE_PLACES_API_KEY = originalGooglePlacesApiKey;
    process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
  });

  it("filters out spillover venues that do not match the pair's requested categories", async () => {
    const { generateVenues } = await import("../venue-generation-service");

    await generateVenues("session-1");

    const candidatePoolRows = mockUpsert.mock.calls[0][0];
    // Safety filter removes the museum (ACTIVITY not in RESTAURANT/BAR prefs),
    // leaving exactly 12 restaurant candidates in the pool.
    expect(candidatePoolRows).toHaveLength(12);
    expect(candidatePoolRows.every((r: { place_id: string }) => r.place_id !== "museum-1")).toBe(true);

    // scoreAndCurate round 1 only receives the 12 restaurants, not the museum
    expect(mockScoreAndCurate).toHaveBeenNthCalledWith(
      1,
      expect.arrayContaining([
        expect.objectContaining({ placeId: "restaurant-1" }),
      ]),
      preferences,
      1,
      { lat: 30.265, lng: -97.745, label: "Midpoint" },
      expect.any(Map),
      expect.any(Map),
    );
  });
});

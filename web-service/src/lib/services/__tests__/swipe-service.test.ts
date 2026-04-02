import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getRoundCompletion,
  getSwipesForRole,
  recordSwipe,
} from "../swipe-service";
import type { SwipeRow } from "../../types/swipe";
import type { VenueRow } from "../../types/venue";

const mockVenueEq = vi.fn();
const mockVenueSelect = vi.fn(() => ({ eq: mockVenueEq }));

const mockSwipeEq = vi.fn();
const mockSwipeSelect = vi.fn(() => ({ eq: mockSwipeEq }));

const mockFrom = vi.fn((table: string) => {
  if (table === "venues") {
    return { select: mockVenueSelect };
  }

  if (table === "swipes") {
    return { select: mockSwipeSelect };
  }

  throw new Error(`Unexpected table: ${table}`);
});

const mockCheckAndRecordMatch = vi.fn();
const mockResolveNoMatch = vi.fn();

vi.mock("../../supabase-server", () => ({
  getSupabaseServerClient: () => ({ from: mockFrom }),
}));

vi.mock("../match-detector", () => ({
  checkAndRecordMatch: (...args: unknown[]) => mockCheckAndRecordMatch(...args),
}));

vi.mock("../round-manager", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../round-manager")>();
  return {
    ...actual,
    resolveNoMatch: (...args: unknown[]) => mockResolveNoMatch(...args),
  };
});

function makeVenueRow(index: number): VenueRow {
  const round = Math.floor(index / 4) + 1;
  const position = (index % 4) + 1;

  return {
    id: `venue-${index + 1}`,
    session_id: "session-1",
    place_id: `place-${index + 1}`,
    name: `Venue ${index + 1}`,
    category: "RESTAURANT",
    address: `${index + 1} Main St`,
    lat: 30.26,
    lng: -97.74,
    price_level: 2,
    rating: 4.5,
    photo_url: null,
    tags: [],
    round,
    position,
    score_category_overlap: 0.9,
    score_distance_to_midpoint: 0.8,
    score_first_date_suitability: 0.85,
    score_quality_signal: 0.8,
    score_time_of_day_fit: 0.75,
  };
}

function makeSwipeRow(
  venueId: string,
  role: "a" | "b",
  liked = true,
): SwipeRow {
  return {
    id: `swipe-${role}-${venueId}`,
    session_id: "session-1",
    venue_id: venueId,
    role,
    liked,
    created_at: "2026-04-01T12:00:00Z",
  };
}

describe("recordSwipe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVenueEq.mockResolvedValue({
      data: Array.from({ length: 12 }, (_, index) => makeVenueRow(index)),
      error: null,
    });
    mockSwipeEq.mockResolvedValue({ data: [], error: null });
    mockCheckAndRecordMatch.mockResolvedValue({
      matched: false,
      venueId: null,
    });
    mockResolveNoMatch.mockResolvedValue({
      venueId: "venue-12",
      reason: "highest_scored",
    });
  });

  it("records an unmatched swipe in the current round and returns round state", async () => {
    const result = await recordSwipe("session-1", "venue-1", "a", true);

    expect(mockCheckAndRecordMatch).toHaveBeenCalledWith(
      "session-1",
      "venue-1",
      "a",
      true,
    );
    expect(result).toEqual({
      matched: false,
      matchedVenueId: null,
      roundComplete: false,
      currentRound: 1,
      sessionStatus: "ready_to_swipe",
    });
  });

  it("returns matched state when the RPC reports a mutual like", async () => {
    mockCheckAndRecordMatch.mockResolvedValue({
      matched: true,
      venueId: "venue-2",
    });

    const result = await recordSwipe("session-1", "venue-2", "b", true);

    expect(result).toEqual({
      matched: true,
      matchedVenueId: "venue-2",
      roundComplete: false,
      currentRound: 1,
      sessionStatus: "matched",
    });
  });

  it("rejects a swipe for a venue outside the current round", async () => {
    mockSwipeEq.mockResolvedValue({
      data: [
        makeSwipeRow("venue-1", "a"),
        makeSwipeRow("venue-2", "a"),
        makeSwipeRow("venue-3", "a"),
        makeSwipeRow("venue-4", "a"),
      ],
      error: null,
    });

    await expect(recordSwipe("session-1", "venue-7", "b", true)).rejects.toThrow(
      "current round",
    );
    expect(mockCheckAndRecordMatch).not.toHaveBeenCalled();
  });

  it("returns only the saved swipes for one role", async () => {
    mockSwipeEq.mockResolvedValue({
      data: [
        makeSwipeRow("venue-1", "a", true),
        makeSwipeRow("venue-2", "a", false),
        makeSwipeRow("venue-3", "b", true),
      ],
      error: null,
    });

    const swipes = await getSwipesForRole("session-1", "a");

    expect(swipes).toEqual([
      {
        id: "swipe-a-venue-1",
        sessionId: "session-1",
        venueId: "venue-1",
        role: "a",
        liked: true,
        createdAt: new Date("2026-04-01T12:00:00Z"),
      },
      {
        id: "swipe-a-venue-2",
        sessionId: "session-1",
        venueId: "venue-2",
        role: "a",
        liked: false,
        createdAt: new Date("2026-04-01T12:00:00Z"),
      },
    ]);
  });

  it("reports round completion counts for both roles", async () => {
    mockSwipeEq.mockResolvedValue({
      data: [
        makeSwipeRow("venue-1", "a"),
        makeSwipeRow("venue-2", "a"),
        makeSwipeRow("venue-3", "a"),
        makeSwipeRow("venue-1", "b"),
        makeSwipeRow("venue-2", "b"),
      ],
      error: null,
    });

    const completion = await getRoundCompletion("session-1", 1);

    expect(completion).toEqual({
      round: 1,
      roleACount: 3,
      roleBCount: 2,
      total: 4,
      complete: false,
    });
  });

  it("returns fallback pending state when round 3 completes without a mutual match", async () => {
    mockSwipeEq.mockResolvedValue({
      data: [
        ...["venue-1", "venue-2", "venue-3", "venue-4"].flatMap((venueId) => [
          makeSwipeRow(venueId, "a"),
          makeSwipeRow(venueId, "b"),
        ]),
        ...["venue-5", "venue-6", "venue-7", "venue-8"].flatMap((venueId) => [
          makeSwipeRow(venueId, "a"),
          makeSwipeRow(venueId, "b"),
        ]),
        makeSwipeRow("venue-9", "a"),
        makeSwipeRow("venue-10", "a"),
        makeSwipeRow("venue-11", "a"),
        makeSwipeRow("venue-12", "a", false),
        makeSwipeRow("venue-9", "b"),
        makeSwipeRow("venue-10", "b"),
        makeSwipeRow("venue-11", "b"),
        makeSwipeRow("venue-12", "b", false),
      ],
      error: null,
    });

    const result = await recordSwipe("session-1", "venue-12", "b", false);

    expect(result).toEqual({
      matched: false,
      matchedVenueId: "venue-12",
      roundComplete: true,
      currentRound: 3,
      sessionStatus: "fallback_pending",
    });
  });
});

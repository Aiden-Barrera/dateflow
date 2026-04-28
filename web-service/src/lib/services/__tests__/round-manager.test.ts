import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getCurrentRound,
  isRoundComplete,
  resolveNoMatch,
} from "../round-manager";
import type { SwipeRow } from "../../types/swipe";
import type { VenueRow } from "../../types/venue";

const mockVenueEq = vi.fn();
const mockVenueSelect = vi.fn(() => ({ eq: mockVenueEq }));

const mockSwipeEq = vi.fn();
const mockSwipeSelect = vi.fn(() => ({ eq: mockSwipeEq }));

const mockSessionUpdateEq = vi.fn();
const mockSessionUpdate = vi.fn(() => ({ eq: mockSessionUpdateEq }));

const mockFrom = vi.fn((table: string) => {
  if (table === "venues") {
    return { select: mockVenueSelect };
  }

  if (table === "swipes") {
    return { select: mockSwipeSelect };
  }

  if (table === "sessions") {
    return { update: mockSessionUpdate };
  }

  throw new Error(`Unexpected table: ${table}`);
});

vi.mock("../../supabase-server", () => ({
  getSupabaseServerClient: () => ({ from: mockFrom }),
}));

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

describe("round-manager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVenueEq.mockResolvedValue({
      data: Array.from({ length: 12 }, (_, index) => makeVenueRow(index)),
      error: null,
    });
    mockSwipeEq.mockResolvedValue({ data: [], error: null });
    mockSessionUpdateEq.mockResolvedValue({ data: [{ id: "session-1" }], error: null });
  });

  it("reports a round as complete only when both roles swiped all 4 venues", async () => {
    mockSwipeEq.mockResolvedValue({
      data: [
        makeSwipeRow("venue-1", "a"),
        makeSwipeRow("venue-2", "a"),
        makeSwipeRow("venue-3", "a"),
        makeSwipeRow("venue-4", "a"),
        makeSwipeRow("venue-1", "b"),
        makeSwipeRow("venue-2", "b"),
        makeSwipeRow("venue-3", "b"),
      ],
      error: null,
    });

    await expect(isRoundComplete("session-1", 1)).resolves.toBe(false);

    mockSwipeEq.mockResolvedValue({
      data: [
        makeSwipeRow("venue-1", "a"),
        makeSwipeRow("venue-2", "a"),
        makeSwipeRow("venue-3", "a"),
        makeSwipeRow("venue-4", "a"),
        makeSwipeRow("venue-1", "b"),
        makeSwipeRow("venue-2", "b"),
        makeSwipeRow("venue-3", "b"),
        makeSwipeRow("venue-4", "b"),
      ],
      error: null,
    });

    await expect(isRoundComplete("session-1", 1)).resolves.toBe(true);
  });

  it("reports a smaller generated round complete when both roles swiped every venue in that round", async () => {
    mockVenueEq.mockResolvedValue({
      data: [
        makeVenueRow(0),
        makeVenueRow(1),
      ],
      error: null,
    });
    mockSwipeEq.mockResolvedValue({
      data: [
        makeSwipeRow("venue-1", "a"),
        makeSwipeRow("venue-2", "a"),
        makeSwipeRow("venue-1", "b"),
        makeSwipeRow("venue-2", "b"),
      ],
      error: null,
    });

    await expect(isRoundComplete("session-1", 1)).resolves.toBe(true);
  });

  it("advances to round 2 only after both roles complete round 1", async () => {
    mockSwipeEq.mockResolvedValue({
      data: [
        makeSwipeRow("venue-1", "a"),
        makeSwipeRow("venue-2", "a"),
        makeSwipeRow("venue-3", "a"),
        makeSwipeRow("venue-4", "a"),
      ],
      error: null,
    });

    await expect(getCurrentRound("session-1")).resolves.toBe(1);

    mockSwipeEq.mockResolvedValue({
      data: [
        makeSwipeRow("venue-1", "a"),
        makeSwipeRow("venue-2", "a"),
        makeSwipeRow("venue-3", "a"),
        makeSwipeRow("venue-4", "a"),
        makeSwipeRow("venue-1", "b"),
        makeSwipeRow("venue-2", "b"),
        makeSwipeRow("venue-3", "b"),
        makeSwipeRow("venue-4", "b"),
      ],
      error: null,
    });

    await expect(getCurrentRound("session-1")).resolves.toBe(2);
  });

  it("stays on round 3 once the first two rounds are complete", async () => {
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
      ],
      error: null,
    });

    await expect(getCurrentRound("session-1")).resolves.toBe(3);
  });

  it("prefers a partially liked venue before the generic top-scored fallback", async () => {
    mockSwipeEq.mockResolvedValue({
      data: [
        makeSwipeRow("venue-7", "a", true),
        makeSwipeRow("venue-8", "a", false),
        makeSwipeRow("venue-8", "b", true),
      ],
      error: null,
    });

    const resolution = await resolveNoMatch("session-1");

    expect(resolution).toEqual({
      venueId: "venue-7",
      reason: "single_like",
    });
    expect(mockSessionUpdate).toHaveBeenCalledWith({
      status: "fallback_pending",
      matched_venue_id: "venue-7",
    });
    expect(mockSessionUpdateEq).toHaveBeenCalledWith("id", "session-1");
  });

  it("falls back to the highest scored venue when no one liked anything", async () => {
    mockVenueEq.mockResolvedValue({
      data: Array.from({ length: 12 }, (_, index) => ({
        ...makeVenueRow(index),
        score_quality_signal: index === 10 ? 1 : 0.8,
        score_category_overlap: index === 10 ? 1 : 0.9,
      })),
      error: null,
    });
    mockSwipeEq.mockResolvedValue({ data: [], error: null });

    const resolution = await resolveNoMatch("session-1");

    expect(resolution).toEqual({
      venueId: "venue-11",
      reason: "highest_scored",
    });
    expect(mockSessionUpdate).toHaveBeenCalledWith({
      status: "fallback_pending",
      matched_venue_id: "venue-11",
    });
  });
});

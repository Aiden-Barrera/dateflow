import { beforeEach, describe, expect, it, vi } from "vitest";
import { getMatchResult } from "../result-service";
import type { SessionRow } from "../../types/session";
import type { VenueRow } from "../../types/venue";

const mockSessionSingle = vi.fn();
const mockSessionEq = vi.fn(() => ({ single: mockSessionSingle }));
const mockSessionSelect = vi.fn(() => ({ eq: mockSessionEq }));

const mockVenueSingle = vi.fn();
const mockVenueEqSession = vi.fn(() => ({ single: mockVenueSingle }));
const mockVenueEqId = vi.fn(() => ({ eq: mockVenueEqSession }));
const mockVenueSelect = vi.fn(() => ({ eq: mockVenueEqId }));

const mockFrom = vi.fn((table: string) => {
  if (table === "sessions") {
    return { select: mockSessionSelect };
  }

  if (table === "venues") {
    return { select: mockVenueSelect };
  }

  throw new Error(`Unexpected table: ${table}`);
});

vi.mock("../../supabase-server", () => ({
  getSupabaseServerClient: () => ({ from: mockFrom }),
}));

const matchedSessionRow: SessionRow = {
  id: "session-1",
  status: "matched",
  creator_display_name: "Alex",
  created_at: "2026-04-02T18:30:00Z",
  matched_at: "2026-04-03T20:45:00Z",
  expires_at: "2026-04-04T18:30:00Z",
  matched_venue_id: "venue-12",
};

const venueRow: VenueRow = {
  id: "venue-12",
  session_id: "session-1",
  place_id: "place-12",
  name: "Cafe Blue",
  category: "RESTAURANT",
  address: "12 Main St",
  lat: 30.26,
  lng: -97.74,
  price_level: 2,
  rating: 4.6,
  photo_url: "https://example.com/photo.jpg",
  tags: ["cozy", "patio"],
  round: 3,
  position: 4,
  score_category_overlap: 0.9,
  score_distance_to_midpoint: 0.8,
  score_first_date_suitability: 0.95,
  score_quality_signal: 0.85,
  score_time_of_day_fit: 0.75,
};

describe("result-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionSingle.mockResolvedValue({ data: matchedSessionRow, error: null });
    mockVenueSingle.mockResolvedValue({ data: venueRow, error: null });
  });

  it("returns the matched result for a matched session", async () => {
    const result = await getMatchResult("session-1");

    expect(mockFrom).toHaveBeenCalledWith("sessions");
    expect(mockSessionEq).toHaveBeenCalledWith("id", "session-1");
    expect(mockFrom).toHaveBeenCalledWith("venues");
    expect(mockVenueEqId).toHaveBeenCalledWith("id", "venue-12");
    expect(mockVenueEqSession).toHaveBeenCalledWith("session_id", "session-1");
    expect(result).toEqual({
      sessionId: "session-1",
      matchedAt: new Date("2026-04-03T20:45:00Z"),
      venue: expect.objectContaining({
        id: "venue-12",
        placeId: "place-12",
        name: "Cafe Blue",
      }),
    });
  });

  it("throws when the session does not exist", async () => {
    mockSessionSingle.mockResolvedValue({
      data: null,
      error: { code: "PGRST116", message: "Row not found" },
    });

    await expect(getMatchResult("missing-session")).rejects.toThrow(
      "Session not found",
    );
    expect(mockVenueSingle).not.toHaveBeenCalled();
  });

  it("throws when the session is not matched", async () => {
    mockSessionSingle.mockResolvedValue({
      data: { ...matchedSessionRow, status: "ready_to_swipe" },
      error: null,
    });

    await expect(getMatchResult("session-1")).rejects.toThrow(
      "Session is not matched",
    );
    expect(mockVenueSingle).not.toHaveBeenCalled();
  });

  it("throws when the matched venue is missing", async () => {
    mockVenueSingle.mockResolvedValue({
      data: null,
      error: { code: "PGRST116", message: "Row not found" },
    });

    await expect(getMatchResult("session-1")).rejects.toThrow(
      "Matched venue not found",
    );
  });
});

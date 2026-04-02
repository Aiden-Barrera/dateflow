import { describe, expect, it } from "vitest";
import { toMatchResult, type MatchResultRow } from "../match-result";

describe("match result type mappers", () => {
  it("maps a joined session and venue row into the app-level match result", () => {
    const row: MatchResultRow = {
      session_id: "session-1",
      matched_at: "2026-04-02T18:30:00Z",
      id: "venue-12",
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

    const result = toMatchResult(row);

    expect(result.sessionId).toBe("session-1");
    expect(result.matchedAt.toISOString()).toBe("2026-04-02T18:30:00.000Z");
    expect(result.venue.id).toBe("venue-12");
    expect(result.venue.placeId).toBe("place-12");
    expect(result.venue.name).toBe("Cafe Blue");
    expect(result.venue.photoUrl).toBe("https://example.com/photo.jpg");
    expect(result.venue.tags).toEqual(["cozy", "patio"]);
  });
});

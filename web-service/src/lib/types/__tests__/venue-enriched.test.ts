import { describe, expect, it } from "vitest";
import { toVenue, type VenueRow } from "../venue";

function baseRow(overrides: Partial<VenueRow> = {}): VenueRow {
  return {
    id: "v1",
    session_id: "s1",
    place_id: "p1",
    name: "Test",
    category: "RESTAURANT",
    address: "1 Main",
    lat: 0,
    lng: 0,
    price_level: 2,
    rating: 4.2,
    photo_url: null,
    photo_urls: [],
    tags: [],
    round: 1,
    position: 1,
    score_category_overlap: 1,
    score_distance_to_midpoint: 1,
    score_first_date_suitability: 1,
    score_quality_signal: 1,
    score_time_of_day_fit: 1,
    ...overrides,
  };
}

describe("toVenue — enriched fields", () => {
  it("maps editorial summary, review count, distance, website, and why_picked", () => {
    const venue = toVenue(
      baseRow({
        editorial_summary: "A cozy spot",
        user_rating_count: 1234,
        distance_meters: 820,
        website: "https://example.com",
        why_picked: "Picked as a great sit-down spot — rated 4.4, 0.5 mi.",
      }),
    );
    expect(venue.editorialSummary).toBe("A cozy spot");
    expect(venue.userRatingCount).toBe(1234);
    expect(venue.distanceMeters).toBe(820);
    expect(venue.website).toBe("https://example.com");
    expect(venue.whyPicked).toContain("Picked as");
  });

  it("maps opening_hours from snake_case JSONB", () => {
    const venue = toVenue(
      baseRow({
        opening_hours: {
          open_now: true,
          weekday_text: ["Mon: 9-5", "Tue: 9-5"],
        },
      }),
    );
    expect(venue.openingHours?.openNow).toBe(true);
    expect(venue.openingHours?.weekdayText).toHaveLength(2);
  });

  it("omits openingHours when openNow is not a boolean", () => {
    const venue = toVenue(baseRow({ opening_hours: { weekday_text: [] } }));
    expect(venue.openingHours).toBeUndefined();
  });

  it("omits optional fields when missing", () => {
    const venue = toVenue(baseRow());
    expect(venue.editorialSummary).toBeUndefined();
    expect(venue.userRatingCount).toBeUndefined();
    expect(venue.distanceMeters).toBeUndefined();
    expect(venue.website).toBeUndefined();
    expect(venue.whyPicked).toBeUndefined();
    expect(venue.openingHours).toBeUndefined();
  });
});

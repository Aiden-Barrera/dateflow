import { describe, expect, it } from "vitest";
import type { Venue } from "../../../../../../lib/types/venue";
import { getVenueSlides } from "../swipe-deck-card";

function makeVenue(overrides: Partial<Venue> = {}): Venue {
  return {
    id: "venue-1",
    sessionId: "session-1",
    placeId: "place-1",
    name: "Cafe Blue",
    category: "RESTAURANT",
    address: "12 Main St, Austin, TX",
    lat: 30.26,
    lng: -97.74,
    priceLevel: 2,
    rating: 4.6,
    photoUrls: [],
    photoUrl: null,
    tags: ["cozy"],
    round: 1,
    position: 1,
    score: {
      categoryOverlap: 0.9,
      distanceToMidpoint: 0.8,
      firstDateSuitability: 0.95,
      qualitySignal: 0.85,
      timeOfDayFit: 0.75,
      composite: 0.875,
    },
    ...overrides,
  };
}

describe("getVenueSlides", () => {
  it("returns the full photo collection when multiple photos exist", () => {
    const venue = makeVenue({
      photoUrls: [
        "https://example.com/photo-1.jpg",
        "https://example.com/photo-2.jpg",
        "https://example.com/photo-3.jpg",
      ],
      photoUrl: "https://example.com/photo-1.jpg",
    });

    expect(getVenueSlides(venue)).toEqual([
      "https://example.com/photo-1.jpg",
      "https://example.com/photo-2.jpg",
      "https://example.com/photo-3.jpg",
    ]);
  });

  it("falls back to the primary photo for legacy single-photo venues", () => {
    const venue = makeVenue({
      photoUrls: [],
      photoUrl: "https://example.com/legacy-photo.jpg",
    });

    expect(getVenueSlides(venue)).toEqual([
      "https://example.com/legacy-photo.jpg",
    ]);
  });
});

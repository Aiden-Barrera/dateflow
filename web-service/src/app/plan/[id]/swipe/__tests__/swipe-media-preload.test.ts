import { describe, expect, it } from "vitest";
import type { Venue } from "../../../../../../lib/types/venue";
import { getRoundPhotoPreloadUrls } from "../swipe-media-preload";

function makeVenue(id: string, overrides: Partial<Venue> = {}): Venue {
  return {
    id,
    sessionId: "session-1",
    placeId: `place-${id}`,
    name: `Venue ${id}`,
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

describe("getRoundPhotoPreloadUrls", () => {
  it("prioritizes the current venue, then the next preview venues, before the rest of the round", () => {
    const urls = getRoundPhotoPreloadUrls(
      [
        makeVenue("venue-1", {
          photoUrls: ["https://example.com/1-a.jpg", "https://example.com/1-b.jpg"],
        }),
        makeVenue("venue-2", {
          photoUrls: ["https://example.com/2-a.jpg"],
        }),
        makeVenue("venue-3", {
          photoUrls: ["https://example.com/3-a.jpg"],
        }),
        makeVenue("venue-4", {
          photoUrls: ["https://example.com/4-a.jpg"],
        }),
      ],
      0,
    );

    expect(urls).toEqual([
      "https://example.com/1-a.jpg",
      "https://example.com/1-b.jpg",
      "https://example.com/2-a.jpg",
      "https://example.com/3-a.jpg",
      "https://example.com/4-a.jpg",
    ]);
  });

  it("deduplicates repeated URLs and falls back to legacy single-photo fields", () => {
    const urls = getRoundPhotoPreloadUrls(
      [
        makeVenue("venue-1", {
          photoUrls: [],
          photoUrl: "https://example.com/shared.jpg",
        }),
        makeVenue("venue-2", {
          photoUrls: [
            "https://example.com/shared.jpg",
            "https://example.com/2-b.jpg",
          ],
        }),
      ],
      0,
    );

    expect(urls).toEqual([
      "https://example.com/shared.jpg",
      "https://example.com/2-b.jpg",
    ]);
  });
});

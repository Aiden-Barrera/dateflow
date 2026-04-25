import { describe, expect, it } from "vitest";
import {
  buildFallbackExplanation,
  buildInitialRetryPreferences,
  resolveFallbackVenue,
} from "../fallback-ending-state";
import type { Venue } from "../../../../../lib/types/venue";

const venues: readonly Venue[] = [
  {
    id: "venue-7",
    sessionId: "session-1",
    placeId: "place-7",
    name: "Cafe Blue",
    category: "RESTAURANT",
    address: "12 Main St, Austin, TX",
    lat: 30.26,
    lng: -97.74,
    priceLevel: 2,
    rating: 4.7,
    photoUrl: "/api/places/photos?name=places%2Fabc%2Fphotos%2Fref",
    photoUrls: [],
      sourceType: "places" as const,
    tags: ["cozy patio"],
    round: 2,
    position: 3,
    score: {
      categoryOverlap: 0.9,
      distanceToMidpoint: 0.8,
      firstDateSuitability: 0.9,
      qualitySignal: 0.85,
      timeOfDayFit: 0.8,
      composite: 0.865,
    },
  },
];

describe("resolveFallbackVenue", () => {
  it("returns the suggested venue when matchedVenueId points at a stored venue", () => {
    expect(resolveFallbackVenue("venue-7", venues)?.name).toBe("Cafe Blue");
  });

  it("returns null when the fallback venue cannot be resolved from the loaded venues", () => {
    expect(resolveFallbackVenue("venue-404", venues)).toBeNull();
  });

  it("builds a plain-language explanation for why the fallback venue was chosen", () => {
    expect(buildFallbackExplanation(venues[0])).toContain("Cafe Blue");
  });

  it("derives retry defaults from the suggested venue", () => {
    expect(buildInitialRetryPreferences(venues[0])).toEqual({
      categories: ["RESTAURANT"],
      budget: "MODERATE",
    });
  });
});

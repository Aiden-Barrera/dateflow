import { describe, expect, it } from "vitest";
import { buildWhyPicked } from "../venue-why-picked";
import type { CuratedVenueCandidate } from "../../types/venue";

function baseCandidate(
  overrides: Partial<CuratedVenueCandidate> = {},
): CuratedVenueCandidate {
  return {
    placeId: "p1",
    name: "Test Venue",
    address: "1 Main St",
    location: { lat: 0, lng: 0, label: "Test Venue" },
    types: ["restaurant"],
    priceLevel: 2,
    rating: 4.4,
    reviewCount: 1200,
    photoReferences: [],
    photoReference: null,
    photoUrls: [],
    category: "RESTAURANT",
    score: {
      categoryOverlap: 1,
      distanceToMidpoint: 1,
      firstDateSuitability: 1,
      qualitySignal: 1,
      timeOfDayFit: 1,
      composite: 1,
    },
    tags: [],
    ...overrides,
  };
}

describe("buildWhyPicked", () => {
  it("returns a <=140-char blurb citing rating and distance", () => {
    const why = buildWhyPicked(baseCandidate(), 800);
    expect(why).toBeDefined();
    expect(why!.length).toBeLessThanOrEqual(140);
    expect(why).toContain("4.4");
    expect(why).toContain("mi");
  });

  it("returns undefined when there are no useful signals", () => {
    const why = buildWhyPicked(
      baseCandidate({ rating: 3.2, reviewCount: 3, editorialSummary: undefined }),
      undefined,
    );
    expect(why).toBeUndefined();
  });

  it("incorporates editorial summary when present", () => {
    const why = buildWhyPicked(
      baseCandidate({ editorialSummary: "Cozy wine bar with small plates" }),
      500,
    );
    expect(why).toBeDefined();
    expect(why!.length).toBeLessThanOrEqual(140);
  });
});

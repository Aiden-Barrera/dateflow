import { describe, expect, it } from "vitest";
import { applySafetyFilter, scoreSafety } from "../safety-filter";
import type { PlaceCandidate } from "../../types/venue";

function makeCandidate(overrides: Partial<PlaceCandidate> = {}): PlaceCandidate {
  return {
    placeId: "candidate-1",
    name: "Test Venue",
    address: "123 Main St",
    location: { lat: 40.75, lng: -74.18, label: "Test Venue" },
    types: ["restaurant"],
    priceLevel: 2,
    rating: 4.6,
    reviewCount: 240,
    photoReference: "photo_ref",
    photoReferences: ["photo_ref"],
    photoUrls: ["/api/places/photos?name=places%2Ftest%2Fphotos%2Fphoto_ref&maxHeightPx=1200"],
    ...overrides,
  };
}

describe("safety-filter date worthiness", () => {
  it("rejects generic retail and errand venues even when they are highly rated", () => {
    const retailCandidate = makeCandidate({
      placeId: "retail-1",
      name: "Target",
      types: ["store", "point_of_interest", "establishment"],
      rating: 4.7,
      reviewCount: 2200,
    });

    const result = applySafetyFilter([retailCandidate]);

    expect(result).toEqual([]);
    expect(scoreSafety(retailCandidate)).toBe(0);
  });

  it("keeps true social venues that fit date intent", () => {
    const socialCandidate = makeCandidate({
      placeId: "social-1",
      name: "Museum Date Night",
      types: ["museum", "tourist_attraction", "point_of_interest"],
      rating: 4.7,
      reviewCount: 1500,
    });

    const result = applySafetyFilter([socialCandidate]);

    expect(result).toHaveLength(1);
    expect(result[0]?.placeId).toBe("social-1");
    expect(scoreSafety(socialCandidate)).toBeGreaterThan(0);
  });
});

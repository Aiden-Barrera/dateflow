import { describe, it, expect } from "vitest";
import { applySafetyFilter, scoreSafety } from "../safety-filter";
import type { PlaceCandidate } from "../../types/venue";

/**
 * Helper to build a PlaceCandidate with sensible defaults.
 * Override only the fields relevant to each test.
 */
function makeCandidate(overrides: Partial<PlaceCandidate> = {}): PlaceCandidate {
  return {
    placeId: "ChIJ_test",
    name: "Test Venue",
    address: "123 Main St, Austin, TX",
    location: { lat: 30.27, lng: -97.74, label: "Test Venue" },
    types: ["restaurant"],
    priceLevel: 2,
    rating: 4.5,
    reviewCount: 200,
    photoReference: "photo_ref",
      sourceType: "places" as const,
    photoReferences: ["photo_ref"],
    photoUrls: ["/api/places/photos?name=places%2Ftest%2Fphotos%2Fphoto_ref&maxHeightPx=1200"],
    ...overrides,
  };
}

describe("safety-filter", () => {
  // ------------------------------------------------------------------
  // applySafetyFilter
  // ------------------------------------------------------------------

  describe("applySafetyFilter", () => {
    it("passes a well-reviewed public restaurant", () => {
      const candidates = [makeCandidate()];

      const result = applySafetyFilter(candidates);

      expect(result).toHaveLength(1);
      expect(result[0].placeId).toBe("ChIJ_test");
    });

    it("rejects a venue with too few reviews", () => {
      const candidates = [makeCandidate({ reviewCount: 10 })];

      const result = applySafetyFilter(candidates);

      expect(result).toHaveLength(0);
    });

    it("rejects a venue with low rating", () => {
      const candidates = [makeCandidate({ rating: 2.5, reviewCount: 100 })];

      const result = applySafetyFilter(candidates);

      expect(result).toHaveLength(0);
    });

    it("rejects unsafe venue types", () => {
      const privateResidence = makeCandidate({
        placeId: "private_1",
        types: ["lodging", "point_of_interest"],
        reviewCount: 100,
      });
      const gasolineStation = makeCandidate({
        placeId: "gas_1",
        types: ["gas_station"],
        reviewCount: 100,
      });

      const result = applySafetyFilter([privateResidence, gasolineStation]);

      expect(result).toHaveLength(0);
    });

    it("rejects grocery and supermarket venues even when they are highly rated", () => {
      const groceryStore = makeCandidate({
        placeId: "grocery_1",
        name: "ShopRite",
        types: ["grocery_store", "supermarket", "food", "store"],
        rating: 4.7,
        reviewCount: 1800,
      });

      const result = applySafetyFilter([groceryStore]);

      expect(result).toHaveLength(0);
    });

    it("rejects fast-food venues even when they also carry restaurant tags", () => {
      const fastFoodVenue = makeCandidate({
        placeId: "fastfood_1",
        name: "Jollibee",
        types: [
          "chicken_restaurant",
          "fast_food_restaurant",
          "restaurant",
          "food",
        ],
        primaryType: "fast_food_restaurant",
        rating: 4.5,
        reviewCount: 900,
      });

      const result = applySafetyFilter([fastFoodVenue]);

      expect(result).toHaveLength(0);
      expect(scoreSafety(fastFoodVenue)).toBe(0);
    });

    it("keeps safe venues and removes unsafe ones from the same list", () => {
      const good = makeCandidate({ placeId: "good_1" });
      const bad = makeCandidate({ placeId: "bad_1", rating: 1.0 });
      const alsoGood = makeCandidate({ placeId: "good_2", types: ["bar"], rating: 4.0, reviewCount: 80 });

      const result = applySafetyFilter([good, bad, alsoGood]);

      expect(result).toHaveLength(2);
      expect(result.map((c) => c.placeId)).toEqual(["good_1", "good_2"]);
    });

    it("returns empty array when given empty input", () => {
      const result = applySafetyFilter([]);

      expect(result).toEqual([]);
    });
  });

  // ------------------------------------------------------------------
  // scoreSafety
  // ------------------------------------------------------------------

  describe("scoreSafety", () => {
    it("returns a high score for an ideal venue", () => {
      const ideal = makeCandidate({ rating: 4.8, reviewCount: 500 });

      const score = scoreSafety(ideal);

      // Should be close to 1.0 (ideal venue)
      expect(score).toBeGreaterThanOrEqual(0.8);
      expect(score).toBeLessThanOrEqual(1.0);
    });

    it("returns 0 for a venue that fails hard rules", () => {
      const unsafe = makeCandidate({ rating: 2.0, reviewCount: 5 });

      const score = scoreSafety(unsafe);

      expect(score).toBe(0);
    });

    it("returns 0 for grocery and supermarket venues", () => {
      const groceryStore = makeCandidate({
        name: "ShopRite",
        types: ["grocery_store", "supermarket", "food", "store"],
        rating: 4.7,
        reviewCount: 1800,
      });

      expect(scoreSafety(groceryStore)).toBe(0);
    });

    it("returns a higher score for more reviews", () => {
      const fewReviews = makeCandidate({ rating: 4.0, reviewCount: 60 });
      const manyReviews = makeCandidate({ rating: 4.0, reviewCount: 500 });

      expect(scoreSafety(manyReviews)).toBeGreaterThan(scoreSafety(fewReviews));
    });

    it("returns a higher score for higher rating", () => {
      const lowerRating = makeCandidate({ rating: 3.6, reviewCount: 200 });
      const higherRating = makeCandidate({ rating: 4.8, reviewCount: 200 });

      expect(scoreSafety(higherRating)).toBeGreaterThan(scoreSafety(lowerRating));
    });
  });
});

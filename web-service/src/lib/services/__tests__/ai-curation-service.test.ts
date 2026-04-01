import { beforeEach, describe, expect, it, vi } from "vitest";
import { scoreAndCurate } from "../ai-curation-service";
import type { PlaceCandidate } from "../../types/venue";
import type { Preference } from "../../types/preference";
import type { Location } from "../../types/preference";

const midpoint: Location = {
  lat: 30.2672,
  lng: -97.7431,
  label: "Midpoint",
};

const preferences: readonly [Preference, Preference] = [
  {
    id: "pref-a",
    sessionId: "session-1",
    role: "a",
    location: { lat: 30.28, lng: -97.74, label: "North Austin" },
    budget: "MODERATE",
    categories: ["RESTAURANT", "BAR"],
    createdAt: new Date("2026-04-01T10:00:00Z"),
  },
  {
    id: "pref-b",
    sessionId: "session-1",
    role: "b",
    location: { lat: 30.25, lng: -97.75, label: "South Austin" },
    budget: "MODERATE",
    categories: ["RESTAURANT", "ACTIVITY"],
    createdAt: new Date("2026-04-01T10:01:00Z"),
  },
];

function makeCandidate(
  placeId: string,
  overrides: Partial<PlaceCandidate> = {}
): PlaceCandidate {
  return {
    placeId,
    name: `Venue ${placeId}`,
    address: "123 Main St, Austin, TX",
    location: midpoint,
    types: ["restaurant"],
    priceLevel: 2,
    rating: 4.5,
    reviewCount: 300,
    photoReference: null,
    ...overrides,
  };
}

describe("scoreAndCurate", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("ANTHROPIC_API_KEY", "");
  });

  it("falls back to deterministic ranking when Anthropic is unavailable", async () => {
    const candidates = [
      makeCandidate("top-choice", { rating: 4.8, reviewCount: 700 }),
      makeCandidate("second-choice", { rating: 3.9, reviewCount: 90 }),
    ];

    const result = await scoreAndCurate(candidates, preferences, 1, midpoint);

    expect(result).toHaveLength(2);
    expect(result[0].placeId).toBe("top-choice");
    expect(result[0].tags).toContain("unscored");
    expect(result[0].score.composite).toBeGreaterThan(result[1].score.composite);
  });

  it("boosts activity-style venues in round 2 fallback scoring", async () => {
    const candidates = [
      makeCandidate("restaurant", {
        types: ["restaurant"],
        rating: 4.5,
        reviewCount: 300,
      }),
      makeCandidate("activity", {
        types: ["bowling_alley"],
        rating: 4.4,
        reviewCount: 280,
      }),
    ];

    const result = await scoreAndCurate(candidates, preferences, 2, midpoint);

    expect(result[0].placeId).toBe("activity");
    expect(result[0].score.timeOfDayFit).toBeGreaterThan(
      result[1].score.timeOfDayFit
    );
  });
});

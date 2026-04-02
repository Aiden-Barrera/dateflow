import { describe, expect, it } from "vitest";
import type { Category, BudgetLevel } from "../../types/preference";
import type { SessionCandidatePoolItem } from "../../types/candidate-pool";
import {
  buildRetryPreferences,
  selectRetryCandidates,
  type RetryPreferencesInput,
  type VenueRetryResult,
} from "../venue-retry-service";

describe("venue-retry-service contract", () => {
  it("normalizes retry preference input into a stable service shape", () => {
    const input: RetryPreferencesInput = {
      categories: ["BAR", "RESTAURANT"],
      budget: "MODERATE",
      radiusMeters: 3000,
    };

    const normalized = buildRetryPreferences(input);

    expect(normalized).toEqual({
      categories: ["BAR", "RESTAURANT"] satisfies readonly Category[],
      budget: "MODERATE" satisfies BudgetLevel,
      radiusMeters: 3000,
    });
  });

  it("defines a rerank result that reports the surfaced batch metadata", () => {
    const result: VenueRetryResult = {
      strategy: "pool_rerank",
      generationBatchId: "batch-2",
      surfacedCycle: 2,
      venueIds: ["venue-13", "venue-14"],
      requiresFullRegeneration: false,
    };

    expect(result.strategy).toBe("pool_rerank");
    expect(result.generationBatchId).toBe("batch-2");
    expect(result.surfacedCycle).toBe(2);
    expect(result.venueIds).toEqual(["venue-13", "venue-14"]);
    expect(result.requiresFullRegeneration).toBe(false);
  });

  it("excludes already surfaced venues when enough unused candidates remain", () => {
    const candidates = Array.from({ length: 15 }, (_, index) =>
      makeCandidatePoolItem(index + 1),
    );

    const selected = selectRetryCandidates(candidates, [
      "place-1",
      "place-2",
      "place-3",
    ]);

    expect(selected).toHaveLength(12);
    expect(selected.map((candidate) => candidate.placeId)).not.toContain("place-1");
    expect(selected.map((candidate) => candidate.placeId)).not.toContain("place-2");
    expect(selected.map((candidate) => candidate.placeId)).not.toContain("place-3");
  });

  it("reuses surfaced venues when excluding them would leave too few options", () => {
    const candidates = Array.from({ length: 12 }, (_, index) =>
      makeCandidatePoolItem(index + 1),
    );

    const selected = selectRetryCandidates(candidates, [
      "place-1",
      "place-2",
      "place-3",
    ]);

    expect(selected).toHaveLength(12);
    expect(selected.map((candidate) => candidate.placeId)).toContain("place-1");
  });
});

function makeCandidatePoolItem(index: number): SessionCandidatePoolItem {
  return {
    id: `item-${index}`,
    poolId: "pool-1",
    placeId: `place-${index}`,
    name: `Venue ${index}`,
    category: "RESTAURANT",
    address: `${index} Main St`,
    lat: 30.26,
    lng: -97.74,
    priceLevel: 2,
    rating: 4.5,
    photoUrl: null,
    rawTypes: ["restaurant"],
    rawTags: [],
    sourceRank: index,
    createdAt: new Date("2026-04-02T10:00:00Z"),
  };
}

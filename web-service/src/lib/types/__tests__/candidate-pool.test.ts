import { describe, expect, it } from "vitest";
import {
  toGenerationBatch,
  toSessionCandidatePool,
  toSessionCandidatePoolItem,
  type GenerationBatchRow,
  type SessionCandidatePoolItemRow,
  type SessionCandidatePoolRow,
} from "../candidate-pool";

describe("candidate pool type mappers", () => {
  it("maps a candidate pool row to the app-level shape", () => {
    const row: SessionCandidatePoolRow = {
      id: "pool-1",
      session_id: "session-1",
      source: "initial_generation",
      created_at: "2026-04-02T10:00:00Z",
    };

    const pool = toSessionCandidatePool(row);

    expect(pool).toEqual({
      id: "pool-1",
      sessionId: "session-1",
      source: "initial_generation",
      createdAt: new Date("2026-04-02T10:00:00Z"),
    });
  });

  it("maps a candidate pool item row to the app-level shape", () => {
    const row: SessionCandidatePoolItemRow = {
      id: "item-1",
      pool_id: "pool-1",
      place_id: "place-1",
      name: "Cafe Blue",
      category: "RESTAURANT",
      address: "1 Main St",
      lat: 30.26,
      lng: -97.74,
      price_level: 2,
      rating: 4.6,
      photo_url: null,
      raw_types: ["restaurant", "cafe"],
      raw_tags: ["cozy"],
      source_rank: 3,
      created_at: "2026-04-02T10:05:00Z",
    };

    const item = toSessionCandidatePoolItem(row);

    expect(item.id).toBe("item-1");
    expect(item.poolId).toBe("pool-1");
    expect(item.placeId).toBe("place-1");
    expect(item.category).toBe("RESTAURANT");
    expect(item.rawTypes).toEqual(["restaurant", "cafe"]);
    expect(item.rawTags).toEqual(["cozy"]);
    expect(item.sourceRank).toBe(3);
    expect(item.createdAt.toISOString()).toBe("2026-04-02T10:05:00.000Z");
  });

  it("maps a generation batch row to the app-level shape", () => {
    const row: GenerationBatchRow = {
      id: "batch-1",
      session_id: "session-1",
      pool_id: "pool-1",
      batch_number: 2,
      generation_strategy: "pool_rerank",
      created_at: "2026-04-02T10:10:00Z",
    };

    const batch = toGenerationBatch(row);

    expect(batch).toEqual({
      id: "batch-1",
      sessionId: "session-1",
      poolId: "pool-1",
      batchNumber: 2,
      generationStrategy: "pool_rerank",
      createdAt: new Date("2026-04-02T10:10:00Z"),
    });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { rerankStoredCandidates } from "../venue-retry-service";
import type { Preference } from "../../types/preference";
import type { SessionCandidatePoolItemRow, SessionCandidatePoolRow } from "../../types/candidate-pool";
import type { CuratedVenueCandidate } from "../../types/venue";

const mockPoolEq = vi.fn();
const mockPoolSelect = vi.fn(() => ({ eq: mockPoolEq }));

const mockPoolItemsEq = vi.fn();
const mockPoolItemsSelect = vi.fn(() => ({ eq: mockPoolItemsEq }));

const mockVenuesEq = vi.fn();
const mockVenuesSelect = vi.fn(() => ({ eq: mockVenuesEq }));
const mockVenuesUpsert = vi.fn();

const mockBatchInsertSingle = vi.fn();
const mockBatchInsertSelect = vi.fn(() => ({ single: mockBatchInsertSingle }));
const mockBatchInsert = vi.fn(() => ({ select: mockBatchInsertSelect }));

const mockFrom = vi.fn((table: string) => {
  if (table === "session_candidate_pools") {
    return { select: mockPoolSelect };
  }

  if (table === "session_candidate_pool_items") {
    return { select: mockPoolItemsSelect };
  }

  if (table === "venue_generation_batches") {
    return { insert: mockBatchInsert };
  }

  if (table === "venues") {
    return { select: mockVenuesSelect, upsert: mockVenuesUpsert };
  }

  throw new Error(`Unexpected table: ${table}`);
});

vi.mock("../../supabase-server", () => ({
  getSupabaseServerClient: () => ({ from: mockFrom }),
}));

const mockGetBothPreferences = vi.fn();
vi.mock("../preference-service", () => ({
  getBothPreferences: (...args: unknown[]) => mockGetBothPreferences(...args),
}));

const mockCalculateMidpoint = vi.fn();
vi.mock("../midpoint-calculator", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../midpoint-calculator")>();
  return {
    ...actual,
    calculateMidpoint: (...args: unknown[]) => mockCalculateMidpoint(...args),
  };
});

const mockScoreAndCurate = vi.fn();
vi.mock("../ai-curation-service", () => ({
  scoreAndCurate: (...args: unknown[]) => mockScoreAndCurate(...args),
}));

const preferences: readonly [Preference, Preference] = [
  {
    id: "pref-a",
    sessionId: "session-1",
    role: "a",
    location: { lat: 30.28, lng: -97.74, label: "North" },
    budget: "MODERATE",
    categories: ["RESTAURANT", "BAR"],
    createdAt: new Date("2026-04-02T10:00:00Z"),
  },
  {
    id: "pref-b",
    sessionId: "session-1",
    role: "b",
    location: { lat: 30.25, lng: -97.75, label: "South" },
    budget: "MODERATE",
    categories: ["RESTAURANT", "ACTIVITY"],
    createdAt: new Date("2026-04-02T10:01:00Z"),
  },
];

describe("rerankStoredCandidates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetBothPreferences.mockResolvedValue(preferences);
    mockCalculateMidpoint.mockReturnValue({
      lat: 30.265,
      lng: -97.745,
      label: "Midpoint",
    });
    mockPoolEq.mockResolvedValue({
      data: [{ id: "pool-1", session_id: "session-1", source: "initial_generation", created_at: "2026-04-02T09:00:00Z" }] satisfies SessionCandidatePoolRow[],
      error: null,
    });
    mockPoolItemsEq.mockResolvedValue({
      data: Array.from({ length: 24 }, (_, index) => makePoolItemRow(index + 1)),
      error: null,
    });
    mockVenuesEq.mockResolvedValue({
      data: Array.from({ length: 12 }, (_, index) => ({
        place_id: `place-${index + 1}`,
        surfaced_cycle: 1,
      })),
      error: null,
    });
    mockBatchInsertSingle.mockResolvedValue({
      data: { id: "batch-2" },
      error: null,
    });
    mockVenuesUpsert.mockResolvedValue({ error: null });
    mockScoreAndCurate.mockImplementation((candidates: CuratedVenueCandidate[]) =>
      Promise.resolve(candidates),
    );
  });

  it("creates a rerank batch from stored unsurfaced candidates and persists cycle 2 venues", async () => {
    const result = await rerankStoredCandidates("session-1", {
      categories: ["RESTAURANT", "BAR"],
      budget: "MODERATE",
    });

    expect(mockBatchInsert).toHaveBeenCalledWith({
      session_id: "session-1",
      pool_id: "pool-1",
      batch_number: 2,
      generation_strategy: "pool_rerank",
    });
    expect(mockScoreAndCurate).toHaveBeenCalledTimes(3);
    expect(mockVenuesUpsert).toHaveBeenCalledWith(
      expect.any(Array),
      { onConflict: "session_id,round,position" },
    );

    const insertedRows = mockVenuesUpsert.mock.calls[0][0];
    expect(insertedRows).toHaveLength(12);
    expect(insertedRows[0].place_id).toBe("place-13");
    expect(insertedRows[0].generation_batch_id).toBe("batch-2");
    expect(insertedRows[0].surfaced_cycle).toBe(2);

    expect(result).toEqual({
      strategy: "pool_rerank",
      generationBatchId: "batch-2",
      surfacedCycle: 2,
      venueIds: expect.any(Array),
      requiresFullRegeneration: false,
    });
  });

  it("signals full regeneration when the stored pool cannot produce a 12-venue retry batch", async () => {
    mockPoolItemsEq.mockResolvedValue({
      data: Array.from({ length: 8 }, (_, index) => makePoolItemRow(index + 1)),
      error: null,
    });
    mockVenuesEq.mockResolvedValue({
      data: Array.from({ length: 8 }, (_, index) => ({
        place_id: `place-${index + 1}`,
        surfaced_cycle: 1,
      })),
      error: null,
    });

    const result = await rerankStoredCandidates("session-1", {
      categories: ["RESTAURANT", "BAR"],
      budget: "MODERATE",
    });

    expect(mockBatchInsert).not.toHaveBeenCalled();
    expect(mockVenuesUpsert).not.toHaveBeenCalled();
    expect(result).toEqual({
      strategy: "full_regeneration",
      generationBatchId: "",
      surfacedCycle: 2,
      venueIds: [],
      requiresFullRegeneration: true,
    });
  });
});

function makePoolItemRow(index: number): SessionCandidatePoolItemRow {
  return {
    id: `item-${index}`,
    pool_id: "pool-1",
    place_id: `place-${index}`,
    name: `Venue ${index}`,
    category: index % 2 === 0 ? "RESTAURANT" : "BAR",
    address: `${index} Main St`,
    lat: 30.26,
    lng: -97.74,
    price_level: 2,
    rating: 4.5,
    photo_url: null,
    raw_types: ["restaurant"],
    raw_tags: [],
    source_rank: index,
    created_at: "2026-04-02T09:00:00Z",
  };
}

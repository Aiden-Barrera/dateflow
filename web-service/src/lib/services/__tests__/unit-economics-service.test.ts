import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSelectSingle = vi.fn();
const mockSelectEq = vi.fn(() => ({ single: mockSelectSingle }));
const mockSelectLimit = vi.fn();
const mockSelectOrder = vi.fn(() => ({ limit: mockSelectLimit }));
const mockSelect = vi.fn(() => ({
  eq: mockSelectEq,
  order: mockSelectOrder,
}));
const mockRpc = vi.fn();
const mockFrom = vi.fn(() => ({
  select: mockSelect,
}));

vi.mock("../../supabase-server", () => ({
  getSupabaseServerClient: () => ({
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  }),
}));

import {
  getUnitEconomicsSnapshot,
  listUnitEconomicsSnapshots,
  recordAiUsage,
  recordPlacesPhotoUsage,
  recordPlacesSearchUsage,
} from "../unit-economics-service";

describe("unit-economics-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectSingle.mockResolvedValue({
      data: null,
      error: { code: "PGRST116", message: "No rows found" },
    });
    mockSelectLimit.mockResolvedValue({
      data: [],
      error: null,
    });
    mockRpc.mockResolvedValue({
      data: [
        {
          session_id: "session-1",
          places_search_requests: 1,
          places_photo_requests: 0,
          ai_requests: 0,
          ai_input_tokens: 0,
          ai_output_tokens: 0,
          places_search_cost_cents: 2,
          places_photo_cost_cents: 0,
          ai_cost_cents: 0,
          infra_cost_cents: 1,
          acquisition_cost_cents: null,
          revenue_cents: 0,
          gross_margin_cents: -3,
          last_computed_at: "2026-04-29T00:00:00Z",
        },
      ],
      error: null,
    });
  });

  it("returns a zeroed snapshot when none exists yet", async () => {
    const snapshot = await getUnitEconomicsSnapshot("session-1");

    expect(mockFrom).toHaveBeenCalledWith("unit_economics_snapshots");
    expect(snapshot).toMatchObject({
      sessionId: "session-1",
      placesSearchRequests: 0,
      placesPhotoRequests: 0,
      aiRequests: 0,
      placesSearchCostCents: 0,
      placesPhotoCostCents: 0,
      aiCostCents: 0,
      infraCostCents: 0,
      revenueCents: 0,
      grossMarginCents: 0,
    });
  });

  it("increments places search requests with a single atomic rpc", async () => {
    mockRpc.mockResolvedValueOnce({
      data: [
        {
          session_id: "session-1",
          places_search_requests: 2,
          places_photo_requests: 0,
          ai_requests: 0,
          ai_input_tokens: 0,
          ai_output_tokens: 0,
          places_search_cost_cents: 4,
          places_photo_cost_cents: 0,
          ai_cost_cents: 0,
          infra_cost_cents: 1,
          acquisition_cost_cents: null,
          revenue_cents: 0,
          gross_margin_cents: -5,
          last_computed_at: "2026-04-29T00:00:00Z",
        },
      ],
      error: null,
    });

    const snapshot = await recordPlacesSearchUsage("session-1", 2);

    expect(mockRpc).toHaveBeenCalledWith("increment_unit_economics_snapshot", {
      input_session_id: "session-1",
      input_places_search_requests: 2,
      input_places_photo_requests: 0,
      input_ai_requests: 0,
      input_ai_input_tokens: 0,
      input_ai_output_tokens: 0,
      input_places_search_cost_cents: 2,
      input_places_photo_cost_cents: 1,
      input_ai_cost_cents: 3,
      input_infra_cost_cents: 1,
    });
    expect(snapshot.placesSearchRequests).toBe(2);
  });

  it("tracks places photo requests separately from search costs", async () => {
    mockRpc.mockResolvedValueOnce({
      data: [
        {
          session_id: "session-1",
          places_search_requests: 1,
          places_photo_requests: 3,
          ai_requests: 0,
          ai_input_tokens: 0,
          ai_output_tokens: 0,
          places_search_cost_cents: 2,
          places_photo_cost_cents: 3,
          ai_cost_cents: 0,
          infra_cost_cents: 1,
          acquisition_cost_cents: null,
          revenue_cents: 0,
          gross_margin_cents: -6,
          last_computed_at: "2026-04-29T00:00:00Z",
        },
      ],
      error: null,
    });

    const snapshot = await recordPlacesPhotoUsage("session-1", 3);

    expect(mockRpc).toHaveBeenCalledWith(
      "increment_unit_economics_snapshot",
      expect.objectContaining({
        input_session_id: "session-1",
        input_places_photo_requests: 3,
        input_places_search_requests: 0,
      }),
    );
    expect(snapshot.placesPhotoCostCents).toBe(3);
  });

  it("tracks ai requests and token counts separately", async () => {
    mockRpc.mockResolvedValueOnce({
      data: [
        {
          session_id: "session-1",
          places_search_requests: 0,
          places_photo_requests: 0,
          ai_requests: 1,
          ai_input_tokens: 321,
          ai_output_tokens: 87,
          places_search_cost_cents: 0,
          places_photo_cost_cents: 0,
          ai_cost_cents: 3,
          infra_cost_cents: 1,
          acquisition_cost_cents: null,
          revenue_cents: 0,
          gross_margin_cents: -4,
          last_computed_at: "2026-04-29T00:00:00Z",
        },
      ],
      error: null,
    });

    const snapshot = await recordAiUsage("session-1", {
      requestCount: 1,
      inputTokens: 321,
      outputTokens: 87,
    });

    expect(mockRpc).toHaveBeenCalledWith(
      "increment_unit_economics_snapshot",
      expect.objectContaining({
        input_ai_requests: 1,
        input_ai_input_tokens: 321,
        input_ai_output_tokens: 87,
      }),
    );
    expect(snapshot.aiRequests).toBe(1);
  });

  it("rejects negative or non-integer deltas before hitting the database", async () => {
    await expect(recordPlacesSearchUsage("session-1", -1)).rejects.toThrow(
      "requestCount must be a non-negative integer",
    );
    await expect(
      recordAiUsage("session-1", {
        requestCount: 1.5,
        inputTokens: 0,
        outputTokens: 0,
      }),
    ).rejects.toThrow("usage.requestCount must be a non-negative integer");

    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("lists recent snapshots for internal inspection", async () => {
    mockSelectLimit.mockResolvedValueOnce({
      data: [
        {
          session_id: "session-1",
          places_search_requests: 2,
          places_photo_requests: 1,
          ai_requests: 0,
          ai_input_tokens: 0,
          ai_output_tokens: 0,
          places_search_cost_cents: 4,
          places_photo_cost_cents: 1,
          ai_cost_cents: 0,
          infra_cost_cents: 1,
          acquisition_cost_cents: null,
          revenue_cents: 0,
          gross_margin_cents: -6,
          last_computed_at: "2026-04-29T00:00:00Z",
        },
      ],
      error: null,
    });

    const snapshots = await listUnitEconomicsSnapshots({ limit: 10 });

    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]?.sessionId).toBe("session-1");
  });
});

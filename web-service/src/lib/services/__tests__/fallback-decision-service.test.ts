import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  acceptFallbackSuggestion,
  requestFallbackRetry,
} from "../fallback-decision-service";
import type { SessionRow } from "../../types/session";
import type { RetryPreferencesInput } from "../venue-retry-service";

const mockSelectSingle = vi.fn();
const mockSelectEq = vi.fn(() => ({ single: mockSelectSingle }));
const mockSelect = vi.fn(() => ({ eq: mockSelectEq }));

const mockUpdateSingle = vi.fn();
const mockUpdateSelect = vi.fn(() => ({ single: mockUpdateSingle }));
const mockUpdateEq = vi.fn(() => ({ select: mockUpdateSelect }));
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }));

const mockDeleteEq = vi.fn();
const mockDelete = vi.fn(() => ({ eq: mockDeleteEq }));

const mockFrom = vi.fn((table: string) => {
  if (table === "sessions") {
    return {
      select: mockSelect,
      update: mockUpdate,
    };
  }

  if (table === "swipes") {
    return {
      delete: mockDelete,
    };
  }

  throw new Error(`Unexpected table: ${table}`);
});

vi.mock("../../supabase-server", () => ({
  getSupabaseServerClient: () => ({ from: mockFrom }),
}));

const mockRerankStoredCandidates = vi.fn();
vi.mock("../venue-retry-service", () => ({
  rerankStoredCandidates: (...args: unknown[]) => mockRerankStoredCandidates(...args),
}));

const baseRow: SessionRow = {
  id: "session-1",
  status: "fallback_pending",
  creator_display_name: "Alex",
  created_at: "2026-04-02T12:00:00Z",
  expires_at: "2026-04-04T12:00:00Z",
  matched_venue_id: "venue-12",
  matched_at: null,
};

describe("fallback-decision-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectSingle.mockResolvedValue({ data: baseRow, error: null });
    mockDeleteEq.mockResolvedValue({ error: null });
    mockRerankStoredCandidates.mockResolvedValue({
      strategy: "pool_rerank",
      generationBatchId: "batch-2",
      surfacedCycle: 2,
      venueIds: ["venue-13"],
      requiresFullRegeneration: false,
    });
  });

  it("accepts a fallback suggestion by promoting the session to matched", async () => {
    mockUpdateSingle.mockResolvedValue({
      data: {
        ...baseRow,
        status: "matched",
        matched_at: "2026-04-03T16:00:00Z",
      },
      error: null,
    });

    const session = await acceptFallbackSuggestion("session-1");

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "matched",
        matched_at: expect.any(String),
      }),
    );
    expect(session.status).toBe("matched");
    expect(session.matchedVenueId).toBe("venue-12");
    expect(session.matchedAt?.toISOString()).toBe("2026-04-03T16:00:00.000Z");
  });

  it("moves a fallback session into retry_pending when users request retry", async () => {
    mockUpdateSingle.mockResolvedValue({
      data: {
        ...baseRow,
        status: "ready_to_swipe",
        matched_venue_id: null,
        matched_at: null,
      },
      error: null,
    });

    const retryPreferences: RetryPreferencesInput = {
      categories: ["BAR", "ACTIVITY"],
      budget: "UPSCALE",
    };
    const session = await requestFallbackRetry("session-1", retryPreferences);

    expect(mockUpdate).toHaveBeenNthCalledWith(1, { status: "reranking" });
    expect(mockRerankStoredCandidates).toHaveBeenCalledWith(
      "session-1",
      retryPreferences,
    );
    expect(mockUpdate).toHaveBeenNthCalledWith(2, {
      status: "ready_to_swipe",
      matched_venue_id: null,
      matched_at: null,
    });
    expect(mockDelete).toHaveBeenCalledTimes(1);
    expect(mockDeleteEq).toHaveBeenCalledWith("session_id", "session-1");
    expect(session.status).toBe("ready_to_swipe");
    expect(session.matchedVenueId).toBeNull();
    expect(session.matchedAt).toBeNull();
  });

  it("moves a fallback session to retry_pending when rerank requires full regeneration", async () => {
    mockRerankStoredCandidates.mockResolvedValue({
      strategy: "full_regeneration",
      generationBatchId: "",
      surfacedCycle: 2,
      venueIds: [],
      requiresFullRegeneration: true,
    });
    mockUpdateSingle
      .mockResolvedValueOnce({
        data: { ...baseRow, status: "reranking" },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { ...baseRow, status: "retry_pending" },
        error: null,
      });

    const session = await requestFallbackRetry("session-1", {
      categories: ["BAR"],
      budget: "MODERATE",
    });

    expect(mockUpdate).toHaveBeenNthCalledWith(2, { status: "retry_pending" });
    expect(session.status).toBe("retry_pending");
  });

  it("reverts reranking back to fallback_pending when rerank throws", async () => {
    mockRerankStoredCandidates.mockRejectedValue(new Error("rerank failed"));
    mockUpdateSingle
      .mockResolvedValueOnce({
        data: { ...baseRow, status: "reranking" },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { ...baseRow, status: "fallback_pending" },
        error: null,
      });

    await expect(
      requestFallbackRetry("session-1", {
        categories: ["BAR"],
        budget: "MODERATE",
      }),
    ).rejects.toThrow("rerank failed");

    expect(mockUpdate).toHaveBeenNthCalledWith(1, { status: "reranking" });
    expect(mockUpdate).toHaveBeenNthCalledWith(2, { status: "fallback_pending" });
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("rejects fallback decisions unless the session is in fallback_pending", async () => {
    mockSelectSingle.mockResolvedValue({
      data: { ...baseRow, status: "ready_to_swipe" },
      error: null,
    });

    await expect(acceptFallbackSuggestion("session-1")).rejects.toThrow(
      "fallback_pending",
    );
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

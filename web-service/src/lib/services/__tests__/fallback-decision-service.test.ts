import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  acceptFallbackSuggestion,
  requestFallbackRetry,
  shouldWaitForPartnerRetryConfirmation,
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
  invitee_display_name: null,
  created_at: "2026-04-02T12:00:00Z",
  expires_at: "2026-04-04T12:00:00Z",
  matched_venue_id: "venue-12",
  matched_at: null,
  retry_initiator_role: null,
  retry_a_confirmed_at: null,
  retry_b_confirmed_at: null,
  retry_a_preferences: null,
  retry_b_preferences: null,
  accept_a_confirmed_at: null,
  accept_b_confirmed_at: null,
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

  it("records the first lock-in without yet transitioning to matched", async () => {
    // First caller (role "a") — partner B hasn't confirmed yet.
    mockUpdateSingle.mockResolvedValue({
      data: {
        ...baseRow,
        accept_a_confirmed_at: "2026-04-03T16:00:00Z",
        accept_b_confirmed_at: null,
      },
      error: null,
    });

    const session = await acceptFallbackSuggestion("session-1", "a");

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ accept_a_confirmed_at: expect.any(String) }),
    );
    expect(session.status).toBe("fallback_pending");
  });

  it("transitions to matched when both sides have confirmed lock-in", async () => {
    // First call: B confirms (A already confirmed in a prior call).
    mockUpdateSingle
      .mockResolvedValueOnce({
        data: {
          ...baseRow,
          accept_a_confirmed_at: "2026-04-03T15:00:00Z",
          accept_b_confirmed_at: "2026-04-03T16:00:00Z",
        },
        error: null,
      })
      // Second call: sets status matched.
      .mockResolvedValueOnce({
        data: {
          ...baseRow,
          status: "matched",
          matched_at: "2026-04-03T16:00:00Z",
          accept_a_confirmed_at: null,
          accept_b_confirmed_at: null,
        },
        error: null,
      });

    const session = await acceptFallbackSuggestion("session-1", "b");

    expect(session.status).toBe("matched");
    expect(session.matchedVenueId).toBe("venue-12");
  });

  it("stores the first retry confirmation and waits for the partner", async () => {
    mockUpdateSingle.mockResolvedValue({
      data: {
        ...baseRow,
        retry_initiator_role: "a",
        retry_a_confirmed_at: "2026-04-03T16:00:00Z",
        retry_a_preferences: {
          categories: ["BAR", "ACTIVITY"],
          budget: "UPSCALE",
          radiusMeters: null,
        },
      },
      error: null,
    });

    const retryPreferences: RetryPreferencesInput = {
      categories: ["BAR", "ACTIVITY"],
      budget: "UPSCALE",
    };
    const session = await requestFallbackRetry("session-1", "a", retryPreferences);

    expect(mockUpdate).toHaveBeenNthCalledWith(1, {
      retry_initiator_role: "a",
      retry_a_confirmed_at: expect.any(String),
      retry_a_preferences: {
        categories: ["BAR", "ACTIVITY"],
        budget: "UPSCALE",
        radiusMeters: null,
      },
    });
    expect(mockRerankStoredCandidates).not.toHaveBeenCalled();
    expect(mockDelete).not.toHaveBeenCalled();
    expect(session.status).toBe("fallback_pending");
  });

  it("reranks only after both users confirm retry preferences", async () => {
    mockSelectSingle.mockResolvedValue({
      data: {
        ...baseRow,
        retry_initiator_role: "a",
        retry_a_confirmed_at: "2026-04-03T15:55:00Z",
        retry_a_preferences: {
          categories: ["BAR"],
          budget: "UPSCALE",
          radiusMeters: null,
        },
      },
      error: null,
    });
    mockUpdateSingle
      .mockResolvedValueOnce({
        data: {
          ...baseRow,
          retry_initiator_role: "a",
          retry_a_confirmed_at: "2026-04-03T15:55:00Z",
          retry_a_preferences: {
            categories: ["BAR"],
            budget: "UPSCALE",
            radiusMeters: null,
          },
          retry_b_confirmed_at: "2026-04-03T16:00:00Z",
          retry_b_preferences: {
            categories: ["ACTIVITY"],
            budget: "MODERATE",
            radiusMeters: null,
          },
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { ...baseRow, status: "reranking" },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          ...baseRow,
          status: "ready_to_swipe",
          matched_venue_id: null,
          matched_at: null,
          retry_initiator_role: null,
          retry_a_confirmed_at: null,
          retry_b_confirmed_at: null,
          retry_a_preferences: null,
          retry_b_preferences: null,
        },
        error: null,
      });

    const session = await requestFallbackRetry("session-1", "b", {
      categories: ["ACTIVITY"],
      budget: "MODERATE",
    });

    expect(mockRerankStoredCandidates).toHaveBeenCalledWith("session-1", {
      categories: ["BAR", "ACTIVITY"],
      budget: "MODERATE",
      radiusMeters: undefined,
    });
    expect(mockDeleteEq).toHaveBeenCalledWith("session_id", "session-1");
    expect(session.status).toBe("ready_to_swipe");
  });

  it("moves a fully confirmed retry into retry_pending when rerank requires full regeneration", async () => {
    mockSelectSingle.mockResolvedValue({
      data: {
        ...baseRow,
        retry_initiator_role: "a",
        retry_a_confirmed_at: "2026-04-03T15:55:00Z",
        retry_a_preferences: {
          categories: ["BAR"],
          budget: "UPSCALE",
          radiusMeters: null,
        },
      },
      error: null,
    });
    mockRerankStoredCandidates.mockResolvedValue({
      strategy: "full_regeneration",
      generationBatchId: "",
      surfacedCycle: 2,
      venueIds: [],
      requiresFullRegeneration: true,
    });
    mockUpdateSingle
      .mockResolvedValueOnce({
        data: {
          ...baseRow,
          retry_initiator_role: "a",
          retry_a_confirmed_at: "2026-04-03T15:55:00Z",
          retry_a_preferences: {
            categories: ["BAR"],
            budget: "UPSCALE",
            radiusMeters: null,
          },
          retry_b_confirmed_at: "2026-04-03T16:00:00Z",
          retry_b_preferences: {
            categories: ["ACTIVITY"],
            budget: "MODERATE",
            radiusMeters: null,
          },
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { ...baseRow, status: "reranking" },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          ...baseRow,
          status: "retry_pending",
          matched_venue_id: null,
          matched_at: null,
          retry_initiator_role: null,
          retry_a_confirmed_at: null,
          retry_b_confirmed_at: null,
          retry_a_preferences: null,
          retry_b_preferences: null,
        },
        error: null,
      });

    const session = await requestFallbackRetry("session-1", "b", {
      categories: ["ACTIVITY"],
      budget: "MODERATE",
    });

    expect(session.status).toBe("retry_pending");
  });

  it("reverts to fallback_pending and clears retry coordination when rerank throws", async () => {
    mockSelectSingle.mockResolvedValue({
      data: {
        ...baseRow,
        retry_initiator_role: "a",
        retry_a_confirmed_at: "2026-04-03T15:55:00Z",
        retry_a_preferences: {
          categories: ["BAR"],
          budget: "UPSCALE",
          radiusMeters: null,
        },
      },
      error: null,
    });
    mockRerankStoredCandidates.mockRejectedValue(new Error("rerank failed"));
    mockUpdateSingle
      .mockResolvedValueOnce({
        data: {
          ...baseRow,
          retry_initiator_role: "a",
          retry_a_confirmed_at: "2026-04-03T15:55:00Z",
          retry_a_preferences: {
            categories: ["BAR"],
            budget: "UPSCALE",
            radiusMeters: null,
          },
          retry_b_confirmed_at: "2026-04-03T16:00:00Z",
          retry_b_preferences: {
            categories: ["ACTIVITY"],
            budget: "MODERATE",
            radiusMeters: null,
          },
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { ...baseRow, status: "reranking" },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          ...baseRow,
          status: "fallback_pending",
          retry_initiator_role: null,
          retry_a_confirmed_at: null,
          retry_b_confirmed_at: null,
          retry_a_preferences: null,
          retry_b_preferences: null,
        },
        error: null,
      });

    await expect(
      requestFallbackRetry("session-1", "b", {
        categories: ["ACTIVITY"],
        budget: "MODERATE",
      }),
    ).rejects.toThrow("rerank failed");

    expect(mockDelete).not.toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenNthCalledWith(2, { status: "reranking" });
    expect(mockUpdate).toHaveBeenNthCalledWith(3, {
      status: "fallback_pending",
      retry_initiator_role: null,
      retry_a_confirmed_at: null,
      retry_b_confirmed_at: null,
      retry_a_preferences: null,
      retry_b_preferences: null,
    });
  });

  it("rejects fallback decisions unless the session is in fallback_pending", async () => {
    mockSelectSingle.mockResolvedValue({
      data: { ...baseRow, status: "ready_to_swipe" },
      error: null,
    });

    await expect(acceptFallbackSuggestion("session-1", "a")).rejects.toThrow(
      "fallback_pending",
    );
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("standardizes Supabase not-found errors for fallback decisions", async () => {
    mockSelectSingle.mockResolvedValue({
      data: null,
      error: { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned" },
    });

    await expect(acceptFallbackSuggestion("session-1", "a")).rejects.toThrow(
      "Session not found",
    );
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("marks a confirmed user as waiting for their partner", () => {
    expect(
      shouldWaitForPartnerRetryConfirmation(
        {
          id: "session-1",
          status: "fallback_pending",
          creatorDisplayName: "Alex",
          inviteeDisplayName: null,
          createdAt: new Date("2026-04-02T12:00:00Z"),
          expiresAt: new Date("2026-04-04T12:00:00Z"),
          matchedVenueId: "venue-12",
          matchedAt: null,
          retryInitiatorRole: "a",
          retryAConfirmedAt: new Date("2026-04-03T16:00:00Z"),
          retryBConfirmedAt: null,
          retryAPreferences: { categories: ["BAR"], budget: "MODERATE" },
          retryBPreferences: null,
          acceptAConfirmedAt: null,
          acceptBConfirmedAt: null,
          confirmedDateTime: null,
        },
        "a",
      ),
    ).toBe(true);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  acceptFallbackSuggestion,
  requestFallbackRetry,
} from "../fallback-decision-service";
import type { SessionRow } from "../../types/session";
import type { PreferenceRow } from "../../types/preference";
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

const mockPreferenceUpdateEqRole = vi.fn();
const mockPreferenceUpdateEqSession = vi.fn(() => ({ eq: mockPreferenceUpdateEqRole }));
const mockPreferenceUpdate = vi.fn(() => ({ eq: mockPreferenceUpdateEqSession }));

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

  if (table === "preferences") {
    return {
      update: mockPreferenceUpdate,
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
  invitee_display_name: "Jordan",
  created_at: "2026-04-02T12:00:00Z",
  expires_at: "2026-04-04T12:00:00Z",
  matched_venue_id: "venue-12",
  matched_at: null,
  retry_initiator_role: null,
  retry_a_confirmed_at: null,
  retry_b_confirmed_at: null,
};

const updatedPreferenceRowA: PreferenceRow = {
  id: "pref-a",
  session_id: "session-1",
  role: "a",
  location: { lat: 30.28, lng: -97.74, label: "North Austin" },
  budget: "UPSCALE",
  categories: ["BAR", "ACTIVITY"],
  created_at: "2026-04-02T10:00:00Z",
};

const updatedPreferenceRowB: PreferenceRow = {
  id: "pref-b",
  session_id: "session-1",
  role: "b",
  location: { lat: 30.25, lng: -97.75, label: "South Austin" },
  budget: "MODERATE",
  categories: ["RESTAURANT", "EVENT"],
  created_at: "2026-04-02T10:01:00Z",
};

describe("fallback-decision-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectSingle.mockResolvedValue({ data: baseRow, error: null });
    mockDeleteEq.mockResolvedValue({ error: null });
    mockPreferenceUpdateEqRole.mockResolvedValue({
      data: [updatedPreferenceRowA],
      error: null,
    });
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

  it("stores the initiating user's retry preferences and waits for the other participant", async () => {
    mockUpdateSingle.mockResolvedValue({
      data: {
        ...baseRow,
        status: "retry_pending",
        retry_initiator_role: "a",
        retry_a_confirmed_at: "2026-04-03T14:00:00Z",
        retry_b_confirmed_at: null,
      },
      error: null,
    });

    const retryPreferences: RetryPreferencesInput = {
      categories: ["BAR", "ACTIVITY"],
      budget: "UPSCALE",
    };
    const session = await requestFallbackRetry("session-1", "a", retryPreferences);

    expect(mockPreferenceUpdate).toHaveBeenCalledWith({
      categories: ["BAR", "ACTIVITY"],
      budget: "UPSCALE",
    });
    expect(mockPreferenceUpdateEqSession).toHaveBeenCalledWith(
      "session_id",
      "session-1",
    );
    expect(mockPreferenceUpdateEqRole).toHaveBeenCalledWith("role", "a");
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "retry_pending",
        retry_initiator_role: "a",
        retry_a_confirmed_at: expect.any(String),
        retry_b_confirmed_at: null,
      }),
    );
    expect(mockRerankStoredCandidates).not.toHaveBeenCalled();
    expect(mockDelete).not.toHaveBeenCalled();
    expect(session.status).toBe("retry_pending");
  });

  it("waits for both people, then reranks using each participant's latest stored retry preferences", async () => {
    mockSelectSingle.mockResolvedValue({
      data: {
        ...baseRow,
        status: "retry_pending",
        retry_initiator_role: "a",
        retry_a_confirmed_at: "2026-04-03T14:00:00Z",
        retry_b_confirmed_at: null,
      },
      error: null,
    });
    mockPreferenceUpdateEqRole.mockResolvedValue({
      data: [updatedPreferenceRowB],
      error: null,
    });
    mockUpdateSingle
      .mockResolvedValueOnce({
        data: {
          ...baseRow,
          status: "reranking",
          retry_initiator_role: "a",
          retry_a_confirmed_at: "2026-04-03T14:00:00Z",
          retry_b_confirmed_at: "2026-04-03T14:05:00Z",
        },
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
        },
        error: null,
      });

    const session = await requestFallbackRetry(
      "session-1",
      "b",
      {
        categories: ["RESTAURANT", "EVENT"],
        budget: "MODERATE",
      },
    );

    expect(mockUpdate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        status: "reranking",
        retry_initiator_role: "a",
        retry_b_confirmed_at: expect.any(String),
      }),
    );
    expect(mockRerankStoredCandidates).toHaveBeenCalledWith("session-1");
    expect(mockUpdate).toHaveBeenNthCalledWith(2, {
      status: "ready_to_swipe",
      matched_venue_id: null,
      matched_at: null,
      retry_initiator_role: null,
      retry_a_confirmed_at: null,
      retry_b_confirmed_at: null,
    });
    expect(mockDelete).toHaveBeenCalledTimes(1);
    expect(session.status).toBe("ready_to_swipe");
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

  it("standardizes Supabase not-found errors for fallback decisions", async () => {
    mockSelectSingle.mockResolvedValue({
      data: null,
      error: { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned" },
    });

    await expect(acceptFallbackSuggestion("session-1")).rejects.toThrow(
      "Session not found",
    );
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

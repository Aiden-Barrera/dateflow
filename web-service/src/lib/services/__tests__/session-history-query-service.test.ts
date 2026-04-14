import { beforeEach, describe, expect, it, vi } from "vitest";
import { getHistory } from "../session-history-service";

const mockSessionAccountsEq = vi.fn();
const mockSessionAccountsSelect = vi.fn(() => ({ eq: mockSessionAccountsEq }));

const mockSessionsOrder = vi.fn();
const mockSessionsIn = vi.fn(() => ({ order: mockSessionsOrder }));
const mockSessionsSelect = vi.fn(() => ({ in: mockSessionsIn }));

const mockVenuesIn = vi.fn();
const mockVenuesSelect = vi.fn(() => ({ in: mockVenuesIn }));

const mockFrom = vi.fn((table: string) => {
  if (table === "session_accounts") {
    return { select: mockSessionAccountsSelect };
  }

  if (table === "sessions") {
    return { select: mockSessionsSelect };
  }

  if (table === "venues") {
    return { select: mockVenuesSelect };
  }

  throw new Error(`Unexpected table ${table}`);
});

vi.mock("../../supabase-server", () => ({
  getSupabaseServerClient: () => ({
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}));

describe("session-history-service getHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionAccountsEq.mockResolvedValue({
      data: [
        { session_id: "session-1", account_id: "account-1", role: "a", linked_at: "2026-04-13T20:00:00Z" },
        { session_id: "session-2", account_id: "account-1", role: "b", linked_at: "2026-04-12T20:00:00Z" },
      ],
      error: null,
    });
    mockSessionsOrder.mockResolvedValue({
      data: [
        {
          id: "session-1",
          status: "matched",
          creator_display_name: "Alex",
          invitee_display_name: "Jordan",
          created_at: "2026-04-13T19:00:00Z",
          expires_at: "2026-04-15T19:00:00Z",
          matched_venue_id: "venue-1",
          matched_at: "2026-04-13T20:00:00Z",
        },
        {
          id: "session-2",
          status: "expired",
          creator_display_name: "Sam",
          invitee_display_name: "Taylor",
          created_at: "2026-04-12T18:00:00Z",
          expires_at: "2026-04-14T18:00:00Z",
          matched_venue_id: null,
          matched_at: null,
        },
      ],
      error: null,
    });
    mockVenuesIn.mockResolvedValue({
      data: [
        {
          id: "venue-1",
          session_id: "session-1",
          place_id: "place-1",
          name: "Cafe Blue",
          category: "RESTAURANT",
          address: "12 Main St, Austin, TX",
          lat: 30.26,
          lng: -97.74,
          price_level: 2,
          rating: 4.6,
          photo_url: "https://example.com/photo.jpg",
          photo_urls: ["https://example.com/photo.jpg"],
          tags: ["cozy"],
          round: 1,
          position: 1,
          score_category_overlap: 0.9,
          score_distance_to_midpoint: 0.8,
          score_first_date_suitability: 0.95,
          score_quality_signal: 0.85,
          score_time_of_day_fit: 0.75,
        },
      ],
      error: null,
    });
  });

  it("returns matched sessions by default, hydrated with venue cards", async () => {
    const result = await getHistory("account-1", 1, 10);

    expect(mockFrom).toHaveBeenCalledWith("session_accounts");
    expect(mockSessionAccountsEq).toHaveBeenCalledWith("account_id", "account-1");
    expect(mockFrom).toHaveBeenCalledWith("sessions");
    expect(mockSessionsIn).toHaveBeenCalledWith("id", ["session-1", "session-2"]);
    expect(result).toEqual({
      sessions: [
        {
          sessionId: "session-1",
          status: "matched",
          createdAt: "2026-04-13T19:00:00.000Z",
          role: "a",
          matchedVenue: {
            name: "Cafe Blue",
            category: "RESTAURANT",
            address: "12 Main St, Austin, TX",
            photoUrl: "https://example.com/photo.jpg",
          },
        },
      ],
      page: 1,
      pageSize: 10,
      totalCount: 1,
      totalPages: 1,
    });
  });

  it("supports includeAll to keep non-matched sessions in history", async () => {
    const result = await getHistory("account-1", 1, 10, true);

    expect(result.sessions).toHaveLength(2);
    expect(result.sessions[1]).toEqual({
      sessionId: "session-2",
      status: "expired",
      createdAt: "2026-04-12T18:00:00.000Z",
      role: "b",
      matchedVenue: null,
    });
  });

  it("paginates after filtering", async () => {
    mockSessionAccountsEq.mockResolvedValue({
      data: [
        { session_id: "session-1", account_id: "account-1", role: "a", linked_at: "2026-04-13T20:00:00Z" },
        { session_id: "session-2", account_id: "account-1", role: "b", linked_at: "2026-04-12T20:00:00Z" },
      ],
      error: null,
    });
    mockSessionsOrder.mockResolvedValue({
      data: [
        {
          id: "session-1",
          status: "matched",
          creator_display_name: "Alex",
          invitee_display_name: "Jordan",
          created_at: "2026-04-13T19:00:00Z",
          expires_at: "2026-04-15T19:00:00Z",
          matched_venue_id: "venue-1",
          matched_at: "2026-04-13T20:00:00Z",
        },
        {
          id: "session-2",
          status: "matched",
          creator_display_name: "Sam",
          invitee_display_name: "Taylor",
          created_at: "2026-04-12T18:00:00Z",
          expires_at: "2026-04-14T18:00:00Z",
          matched_venue_id: null,
          matched_at: "2026-04-12T20:00:00Z",
        },
      ],
      error: null,
    });

    const result = await getHistory("account-1", 2, 1);

    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(1);
    expect(result.totalCount).toBe(2);
    expect(result.totalPages).toBe(2);
    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0].sessionId).toBe("session-2");
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createSession,
  getSession,
  validateSessionForJoin,
  expireStaleSessions,
} from "../session-service";
import type { SessionRow } from "../../types/session";

// ---------------------------------------------------------------------------
// Mock the server Supabase client
// ---------------------------------------------------------------------------
// Supabase uses two different chain patterns:
//   INSERT: supabase.from("sessions").insert({...}).select().single()
//   SELECT: supabase.from("sessions").select().eq("id", id).single()
//
// We mock both chains. mockInsertSingle and mockQuerySingle are separate
// so we can configure insert vs select results independently per test.

// INSERT chain: from().insert().select().single()
const mockInsertSingle = vi.fn();
const mockInsertSelect = vi.fn(() => ({ single: mockInsertSingle }));
const mockInsert = vi.fn(() => ({ select: mockInsertSelect }));

// SELECT chain: from().select().eq().single()
const mockQuerySingle = vi.fn();
const mockEq = vi.fn(() => ({ single: mockQuerySingle }));
const mockQuerySelect = vi.fn(() => ({ eq: mockEq }));

// UPDATE chain: from().update().neq().lte()
// .lte() is the terminal call that returns { data, error, count }
const mockLte = vi.fn();
const mockNeq = vi.fn(() => ({ neq: mockNeq, lte: mockLte }));
const mockUpdate = vi.fn(() => ({ neq: mockNeq }));

// from() returns all three chains
const mockFrom = vi.fn(() => ({
  insert: mockInsert,
  select: mockQuerySelect,
  update: mockUpdate,
}));

vi.mock("../../supabase-server", () => ({
  getSupabaseServerClient: () => ({ from: mockFrom }),
}));

// A fake row that Supabase would return after a successful insert
const fakeRow: SessionRow = {
  id: "fake-uuid-1234",
  status: "pending_b",
  creator_display_name: "Alex",
  created_at: "2026-03-27T12:00:00Z",
  expires_at: "2026-03-29T12:00:00Z",
  matched_venue_id: null,
  matched_at: null,
};

describe("createSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: successful insert
    mockInsertSingle.mockResolvedValue({ data: fakeRow, error: null });
  });

  it("creates a session with pending_b status and returns it", async () => {
    const session = await createSession("Alex");

    // Verify the service called Supabase correctly
    expect(mockFrom).toHaveBeenCalledWith("sessions");
    expect(mockInsert).toHaveBeenCalledWith({
      creator_display_name: "Alex",
    });

    // Verify the returned Session is properly mapped from the row
    expect(session.id).toBe("fake-uuid-1234");
    expect(session.status).toBe("pending_b");
    expect(session.creatorDisplayName).toBe("Alex");
    expect(session.createdAt).toBeInstanceOf(Date);
    expect(session.matchedVenueId).toBeNull();
  });

  it("trims whitespace from creatorDisplayName", async () => {
    mockInsertSingle.mockResolvedValue({
      data: { ...fakeRow, creator_display_name: "Alex" },
      error: null,
    });

    await createSession("  Alex  ");

    // The trimmed name should be sent to Supabase
    expect(mockInsert).toHaveBeenCalledWith({
      creator_display_name: "Alex",
    });
  });

  it("throws when creatorDisplayName is empty", async () => {
    await expect(createSession("")).rejects.toThrow("Display name");
  });

  it("throws when creatorDisplayName is only whitespace", async () => {
    await expect(createSession("   ")).rejects.toThrow("Display name");
  });

  it("throws when creatorDisplayName exceeds 50 characters", async () => {
    const longName = "A".repeat(51);
    await expect(createSession(longName)).rejects.toThrow("50 characters");
  });

  it("throws when creatorDisplayName contains HTML tags", async () => {
    await expect(createSession("<script>alert('xss')</script>")).rejects.toThrow(
      "HTML"
    );
  });

  it("throws when Supabase insert fails", async () => {
    mockInsertSingle.mockResolvedValue({
      data: null,
      error: { message: "DB connection lost", code: "PGRST000" },
    });

    await expect(createSession("Alex")).rejects.toThrow("DB connection lost");
  });
});

// ---------------------------------------------------------------------------
// getSession
// ---------------------------------------------------------------------------

describe("getSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a session when found", async () => {
    mockQuerySingle.mockResolvedValue({ data: fakeRow, error: null });

    const session = await getSession("fake-uuid-1234");

    expect(mockFrom).toHaveBeenCalledWith("sessions");
    expect(mockEq).toHaveBeenCalledWith("id", "fake-uuid-1234");
    expect(session).not.toBeNull();
    expect(session!.id).toBe("fake-uuid-1234");
    expect(session!.status).toBe("pending_b");
    expect(session!.createdAt).toBeInstanceOf(Date);
  });

  it("returns null when session does not exist", async () => {
    // Supabase returns an error with code PGRST116 when .single() finds no rows
    mockQuerySingle.mockResolvedValue({
      data: null,
      error: { message: "Row not found", code: "PGRST116" },
    });

    const session = await getSession("nonexistent-id");

    expect(session).toBeNull();
  });

  it("throws when Supabase returns an unexpected error", async () => {
    mockQuerySingle.mockResolvedValue({
      data: null,
      error: { message: "connection timeout", code: "PGRST000" },
    });

    await expect(getSession("some-id")).rejects.toThrow("connection timeout");
  });
});

// ---------------------------------------------------------------------------
// validateSessionForJoin
// ---------------------------------------------------------------------------

describe("validateSessionForJoin", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns session when status is pending_b and not expired", async () => {
    // Session expires March 29; "now" is March 28 — still active
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-28T12:00:00Z"));
    mockQuerySingle.mockResolvedValue({ data: fakeRow, error: null });

    const session = await validateSessionForJoin("fake-uuid-1234");

    expect(session.id).toBe("fake-uuid-1234");
    expect(session.status).toBe("pending_b");
  });

  it("throws when session is not found", async () => {
    mockQuerySingle.mockResolvedValue({
      data: null,
      error: { message: "Row not found", code: "PGRST116" },
    });

    await expect(validateSessionForJoin("nonexistent-id")).rejects.toThrow(
      "not found"
    );
  });

  it("throws when session status is not pending_b", async () => {
    const matchedRow: SessionRow = { ...fakeRow, status: "matched" };
    mockQuerySingle.mockResolvedValue({ data: matchedRow, error: null });

    // Time doesn't matter here — the status check comes first
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-28T12:00:00Z"));

    await expect(validateSessionForJoin("fake-uuid-1234")).rejects.toThrow(
      "not available to join"
    );
  });

  it("throws when session is past expiresAt even if status is still pending_b", async () => {
    // Status says pending_b but the clock says it's past expiresAt.
    // This is the gap between pg_cron runs — the app catches it.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-30T12:00:00Z"));
    mockQuerySingle.mockResolvedValue({ data: fakeRow, error: null });

    await expect(validateSessionForJoin("fake-uuid-1234")).rejects.toThrow(
      "expired"
    );
  });
});

// ---------------------------------------------------------------------------
// expireStaleSessions
// ---------------------------------------------------------------------------

describe("expireStaleSessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates expired sessions and returns the count", async () => {
    // Supabase returns count when you pass { count: "exact" } to .update()
    mockLte.mockResolvedValue({ data: null, error: null, count: 3 });

    const count = await expireStaleSessions();

    // Verify the correct table and update payload
    expect(mockFrom).toHaveBeenCalledWith("sessions");
    expect(mockUpdate).toHaveBeenCalledWith(
      { status: "expired" },
      { count: "exact" }
    );
    // Should exclude already-terminal statuses (expired and matched)
    expect(mockNeq).toHaveBeenCalledWith("status", "expired");
    expect(mockNeq).toHaveBeenCalledWith("status", "matched");
    // Should only expire sessions past their expiresAt
    expect(mockLte).toHaveBeenCalledWith(
      "expires_at",
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/)
    );
    expect(count).toBe(3);
  });

  it("returns 0 when no sessions need expiring", async () => {
    mockLte.mockResolvedValue({ data: null, error: null, count: 0 });

    const count = await expireStaleSessions();

    expect(count).toBe(0);
  });

  it("throws when Supabase update fails", async () => {
    mockLte.mockResolvedValue({
      data: null,
      error: { message: "permission denied", code: "42501" },
      count: null,
    });

    await expect(expireStaleSessions()).rejects.toThrow("permission denied");
  });
});

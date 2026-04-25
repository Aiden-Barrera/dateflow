import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  submitPreference,
  getPreferences,
  getBothPreferences,
} from "../preference-service";
import type { PreferenceRow } from "../../types/preference";
import type { PreferenceInput } from "../../types/preference";

// ---------------------------------------------------------------------------
// Mock the server Supabase client
// ---------------------------------------------------------------------------
// Three chain patterns used by this service:
//   INSERT:  supabase.from("preferences").insert({...}).select().single()
//   SELECT:  supabase.from("preferences").select().eq("session_id", id)
//   UPDATE:  supabase.from("sessions").update({...}).eq("id", id)
//
// from() returns different shapes depending on the table name, so we can
// control preferences vs sessions behavior independently.

// INSERT chain: from("preferences").insert().select().single()
const mockInsertSingle = vi.fn();
const mockInsertSelect = vi.fn(() => ({ single: mockInsertSingle }));
const mockInsert = vi.fn(() => ({ select: mockInsertSelect }));

// SELECT chain: from("preferences").select().eq()
const mockSelectEq = vi.fn();
const mockQuerySelect = vi.fn(() => ({ eq: mockSelectEq }));

// UPDATE chain: from("sessions").update().eq("id", ...).eq("status", ...)
// Second .eq() is the terminal call that returns { data, error }
const mockUpdateStatusEq = vi.fn();
const mockUpdateIdEq = vi.fn(() => ({ eq: mockUpdateStatusEq }));
const mockUpdate = vi.fn(() => ({ eq: mockUpdateIdEq }));

// from() routes to the right chain based on table name
const mockFrom = vi.fn((table: string) => {
  if (table === "sessions") {
    return { update: mockUpdate };
  }
  // "preferences" — needs both insert and select
  return {
    insert: mockInsert,
    select: mockQuerySelect,
  };
});

vi.mock("../../supabase-server", () => ({
  getSupabaseServerClient: () => ({ from: mockFrom }),
}));

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const fakeInput: PreferenceInput = {
  role: "a",
  location: { lat: 30.2672, lng: -97.7431, label: "Downtown Austin" },
  budget: "MODERATE",
  categories: ["RESTAURANT", "BAR"],
};

const fakeRow: PreferenceRow = {
  id: "pref-uuid-1234",
  session_id: "session-uuid-5678",
  role: "a",
  location: { lat: 30.2672, lng: -97.7431, label: "Downtown Austin" },
  budget: "MODERATE",
  categories: ["RESTAURANT", "BAR"],
  created_at: "2026-03-29T12:00:00Z",
  schedule_window: null,
  available_days: null,
  time_of_day: null,
};

const fakeRowB: PreferenceRow = {
  id: "pref-uuid-5678",
  session_id: "session-uuid-5678",
  role: "b",
  location: { lat: 30.25, lng: -97.75, label: "South Congress" },
  budget: "UPSCALE",
  categories: ["RESTAURANT", "ACTIVITY"],
  created_at: "2026-03-29T13:00:00Z",
  schedule_window: null,
  available_days: null,
  time_of_day: null,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("submitPreference", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: successful insert, only one preference exists (no transition)
    mockInsertSingle.mockResolvedValue({ data: fakeRow, error: null });
    mockSelectEq.mockResolvedValue({ data: [fakeRow], error: null });
  });

  it("inserts a preference row and returns the mapped Preference", async () => {
    const result = await submitPreference("session-uuid-5678", fakeInput);

    // Verify it called supabase with the right table and payload
    expect(mockFrom).toHaveBeenCalledWith("preferences");
    expect(mockInsert).toHaveBeenCalledWith({
      session_id: "session-uuid-5678",
      role: "a",
      location: { lat: 30.2672, lng: -97.7431, label: "Downtown Austin" },
      budget: "MODERATE",
      categories: ["RESTAURANT", "BAR"],
    });

    // Verify the returned object is mapped from snake_case to camelCase
    expect(result).toEqual({
      id: "pref-uuid-1234",
      sessionId: "session-uuid-5678",
      role: "a",
      location: { lat: 30.2672, lng: -97.7431, label: "Downtown Austin" },
      budget: "MODERATE",
      categories: ["RESTAURANT", "BAR"],
      createdAt: new Date("2026-03-29T12:00:00Z"),
    });
  });

  it("throws when Supabase returns an error", async () => {
    mockInsertSingle.mockResolvedValue({
      data: null,
      error: { message: "duplicate key value violates unique constraint" },
    });

    await expect(
      submitPreference("session-uuid-5678", fakeInput)
    ).rejects.toThrow("duplicate key value violates unique constraint");
  });

  it("transitions session to both_ready when second preference arrives", async () => {
    // Person B submits — now both rows exist
    mockInsertSingle.mockResolvedValue({ data: fakeRowB, error: null });
    mockSelectEq.mockResolvedValue({ data: [fakeRow, fakeRowB], error: null });
    mockUpdateStatusEq.mockResolvedValue({ data: null, error: null });

    await submitPreference("session-uuid-5678", {
      ...fakeInput,
      role: "b",
    });

    // Verify it queried preferences to count them
    expect(mockFrom).toHaveBeenCalledWith("preferences");
    expect(mockSelectEq).toHaveBeenCalledWith("session_id", "session-uuid-5678");

    // Verify it updated the session status — only from pending_b
    expect(mockFrom).toHaveBeenCalledWith("sessions");
    expect(mockUpdate).toHaveBeenCalledWith({ status: "both_ready" });
    expect(mockUpdateIdEq).toHaveBeenCalledWith("id", "session-uuid-5678");
    expect(mockUpdateStatusEq).toHaveBeenCalledWith("status", "pending_b");
  });

  it("does NOT transition when only one preference exists", async () => {
    // Person A submits — only one row exists
    mockInsertSingle.mockResolvedValue({ data: fakeRow, error: null });
    mockSelectEq.mockResolvedValue({ data: [fakeRow], error: null });

    await submitPreference("session-uuid-5678", fakeInput);

    // Verify it did NOT touch the sessions table
    expect(mockFrom).not.toHaveBeenCalledWith("sessions");
  });

  it("returns the preference even when transition happens", async () => {
    mockInsertSingle.mockResolvedValue({ data: fakeRowB, error: null });
    mockSelectEq.mockResolvedValue({ data: [fakeRow, fakeRowB], error: null });
    mockUpdateStatusEq.mockResolvedValue({ data: null, error: null });

    const result = await submitPreference("session-uuid-5678", {
      ...fakeInput,
      role: "b",
    });

    // The caller still gets back the preference they submitted
    expect(result.id).toBe("pref-uuid-5678");
    expect(result.role).toBe("b");
  });
});

// ---------------------------------------------------------------------------
// getPreferences
// ---------------------------------------------------------------------------

describe("getPreferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns mapped preferences when rows exist", async () => {
    mockSelectEq.mockResolvedValue({ data: [fakeRow, fakeRowB], error: null });

    const result = await getPreferences("session-uuid-5678");

    // Verify correct table and filter
    expect(mockFrom).toHaveBeenCalledWith("preferences");
    expect(mockSelectEq).toHaveBeenCalledWith("session_id", "session-uuid-5678");

    // Verify both rows are mapped to domain objects
    expect(result).toEqual([
      {
        id: "pref-uuid-1234",
        sessionId: "session-uuid-5678",
        role: "a",
        location: { lat: 30.2672, lng: -97.7431, label: "Downtown Austin" },
        budget: "MODERATE",
        categories: ["RESTAURANT", "BAR"],
        createdAt: new Date("2026-03-29T12:00:00Z"),
      },
      {
        id: "pref-uuid-5678",
        sessionId: "session-uuid-5678",
        role: "b",
        location: { lat: 30.25, lng: -97.75, label: "South Congress" },
        budget: "UPSCALE",
        categories: ["RESTAURANT", "ACTIVITY"],
        createdAt: new Date("2026-03-29T13:00:00Z"),
      },
    ]);
  });

  it("returns empty array when no preferences exist", async () => {
    mockSelectEq.mockResolvedValue({ data: [], error: null });

    const result = await getPreferences("session-uuid-5678");

    expect(result).toEqual([]);
  });

  it("throws when Supabase returns an error", async () => {
    mockSelectEq.mockResolvedValue({
      data: null,
      error: { message: "connection refused" },
    });

    await expect(getPreferences("session-uuid-5678")).rejects.toThrow(
      "connection refused"
    );
  });
});

// ---------------------------------------------------------------------------
// getBothPreferences
// ---------------------------------------------------------------------------

describe("getBothPreferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns both preferences as a tuple when both exist", async () => {
    mockSelectEq.mockResolvedValue({ data: [fakeRow, fakeRowB], error: null });

    const [prefA, prefB] = await getBothPreferences("session-uuid-5678");

    expect(prefA.role).toBe("a");
    expect(prefA.id).toBe("pref-uuid-1234");
    expect(prefB.role).toBe("b");
    expect(prefB.id).toBe("pref-uuid-5678");
  });

  it("throws when fewer than two preferences exist", async () => {
    // Only Person A has submitted — Person B hasn't yet
    mockSelectEq.mockResolvedValue({ data: [fakeRow], error: null });

    await expect(getBothPreferences("session-uuid-5678")).rejects.toThrow(
      "Both preferences are required"
    );
  });

  it("throws when zero preferences exist", async () => {
    mockSelectEq.mockResolvedValue({ data: [], error: null });

    await expect(getBothPreferences("session-uuid-5678")).rejects.toThrow(
      "Both preferences are required"
    );
  });
});

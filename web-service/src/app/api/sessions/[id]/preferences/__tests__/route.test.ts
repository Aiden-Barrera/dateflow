import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock dependencies
// ---------------------------------------------------------------------------
// The route calls three things:
//   1. getSession (from session-service) — to check the session exists/not expired
//   2. getPreferences (from preference-service) — to check for duplicate role
//   3. submitPreference (from preference-service) — to insert the preference
//
// We mock all three so we can test the route's validation and HTTP behavior
// without touching a database.

const mockGetSession = vi.fn();
vi.mock("../../../../../../lib/services/session-service", () => ({
  getSession: (...args: unknown[]) => mockGetSession(...args),
}));

const mockGetPreferences = vi.fn();
const mockSubmitPreference = vi.fn();
vi.mock("../../../../../../lib/services/preference-service", () => ({
  getPreferences: (...args: unknown[]) => mockGetPreferences(...args),
  submitPreference: (...args: unknown[]) => mockSubmitPreference(...args),
}));

const mockEnqueueVenueGeneration = vi.fn();
vi.mock("../../../../../../lib/qstash", () => ({
  enqueueVenueGeneration: (...args: unknown[]) => mockEnqueueVenueGeneration(...args),
}));

const mockGenerateVenues = vi.fn();
const mockGenerateDemoVenues = vi.fn();
vi.mock("../../../../../../lib/services/venue-generation-service", () => ({
  generateVenues: (...args: unknown[]) => mockGenerateVenues(...args),
}));
vi.mock("../../../../../../lib/services/demo-venue-service", () => ({
  generateDemoVenues: (...args: unknown[]) => mockGenerateDemoVenues(...args),
}));

import { POST } from "../route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SESSION_ID = "123e4567-e89b-42d3-a456-426614174000";

/** Builds a POST request with a JSON body */
function makePostRequest(body: unknown): Request {
  return new Request(`http://localhost:3000/api/sessions/${SESSION_ID}/preferences`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** The route params that Next.js passes — id comes from the [id] URL segment */
function makeParams(id = SESSION_ID) {
  return { params: Promise.resolve({ id }) };
}

/** A valid preference payload — the baseline for tests that modify one field */
const validBody = {
  role: "b",
  location: { lat: 30.2672, lng: -97.7431, label: "Downtown Austin" },
  budget: "MODERATE",
  categories: ["RESTAURANT", "BAR"],
};

/** A fake active session — not expired, status pending_b */
const fakeSession = {
  id: SESSION_ID,
  status: "pending_b",
  creatorDisplayName: "Alex",
  createdAt: new Date("2026-03-27T12:00:00Z"),
  expiresAt: new Date("2026-03-29T12:00:00Z"),
  matchedVenueId: null,
};

/** The preference object that submitPreference returns */
const fakePreference = {
  id: "pref-uuid-1234",
  sessionId: SESSION_ID,
  role: "b",
  location: { lat: 30.2672, lng: -97.7431, label: "Downtown Austin" },
  budget: "MODERATE",
  categories: ["RESTAURANT", "BAR"],
  createdAt: new Date("2026-03-29T14:00:00Z"),
};

const originalCookieSecret = process.env.SESSION_ROLE_COOKIE_SECRET;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/sessions/[id]/preferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    process.env.SESSION_ROLE_COOKIE_SECRET = "test-secret";
    // Default: session exists, not expired, no existing preferences
    vi.setSystemTime(new Date("2026-03-28T12:00:00Z"));
    mockGetSession.mockResolvedValue(fakeSession);
    mockGetPreferences.mockResolvedValue([]);
    mockSubmitPreference.mockResolvedValue(fakePreference);
    mockEnqueueVenueGeneration.mockResolvedValue(undefined);
    mockGenerateVenues.mockResolvedValue(undefined);
    mockGenerateDemoVenues.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    process.env.SESSION_ROLE_COOKIE_SECRET = originalCookieSecret;
  });

  // --- Happy path ---

  it("returns 201 with the serialized preference on success", async () => {
    const response = await POST(makePostRequest(validBody), makeParams());
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.preference.id).toBe("pref-uuid-1234");
    expect(body.preference.sessionId).toBe(SESSION_ID);
    expect(body.preference.role).toBe("b");
    expect(body.preference.createdAt).toBe("2026-03-29T14:00:00.000Z");

    expect(mockSubmitPreference).toHaveBeenCalledWith(SESSION_ID, {
      role: "b",
      location: { lat: 30.2672, lng: -97.7431, label: "Downtown Austin" },
      budget: "MODERATE",
      categories: ["RESTAURANT", "BAR"],
    });
    expect(mockEnqueueVenueGeneration).not.toHaveBeenCalled();
  });

  it("binds the submitted role to the browser with a session cookie", async () => {
    const response = await POST(makePostRequest(validBody), makeParams());

    expect(response.status).toBe(201);
    expect(response.headers.get("set-cookie")).toContain(
      `dateflow_session_role_${SESSION_ID}=b`,
    );
  });

  it("enqueues venue generation when the second preference is submitted", async () => {
    mockGetPreferences.mockResolvedValue([
      { ...fakePreference, role: "a" },
    ]);

    const response = await POST(makePostRequest(validBody), makeParams());

    expect(response.status).toBe(201);
    expect(mockEnqueueVenueGeneration).toHaveBeenCalledWith(SESSION_ID);
  });

  it("falls back to direct generation when enqueueing fails", async () => {
    mockGetPreferences.mockResolvedValue([{ ...fakePreference, role: "a" }]);
    mockEnqueueVenueGeneration.mockRejectedValueOnce(new Error("QStash down"));

    const response = await POST(makePostRequest(validBody), makeParams());

    expect(response.status).toBe(201);
    expect(mockGenerateVenues).toHaveBeenCalledWith(SESSION_ID);
  });

  it("uses demo venue generation instead of qstash when demo mode is enabled", async () => {
    mockGetPreferences.mockResolvedValue([{ ...fakePreference, role: "a" }]);

    const response = await POST(
      makePostRequest({ ...validBody, demo: true }),
      makeParams(),
    );

    expect(response.status).toBe(201);
    expect(mockGenerateDemoVenues).toHaveBeenCalledWith(SESSION_ID);
    expect(mockEnqueueVenueGeneration).not.toHaveBeenCalled();
    expect(mockGenerateVenues).not.toHaveBeenCalled();
  });

  it("still returns the bound role cookie when demo generation fails after preference submission", async () => {
    mockGetPreferences.mockResolvedValue([{ ...fakePreference, role: "a" }]);
    mockGenerateDemoVenues.mockRejectedValueOnce(new Error("demo generation failed"));

    const response = await POST(
      makePostRequest({ ...validBody, demo: true }),
      makeParams(),
    );

    expect(response.status).toBe(201);
    expect(response.headers.get("set-cookie")).toContain(
      `dateflow_session_role_${SESSION_ID}=b`,
    );
  });

  it("returns 400 when the session id is not a UUID", async () => {
    const response = await POST(makePostRequest(validBody), makeParams("abc-123"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Session ID must be a valid UUID");
  });

  // --- Request body validation ---

  it("returns 400 when body is not valid JSON", async () => {
    const request = new Request(
      `http://localhost:3000/api/sessions/${SESSION_ID}/preferences`,
      { method: "POST", body: "not json" }
    );
    const response = await POST(request, makeParams());
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBeDefined();
  });

  it("returns 400 when body is not an object", async () => {
    const response = await POST(makePostRequest("string"), makeParams());
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBeDefined();
  });

  // --- Role validation ---

  it("returns 400 when role is missing", async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { role, ...noRole } = validBody;
    const response = await POST(makePostRequest(noRole), makeParams());

    expect(response.status).toBe(400);
  });

  it("returns 400 when role is not 'a' or 'b'", async () => {
    const response = await POST(
      makePostRequest({ ...validBody, role: "c" }),
      makeParams()
    );

    expect(response.status).toBe(400);
  });

  // --- Location validation ---

  it("returns 400 when location is missing", async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { location, ...noLocation } = validBody;
    const response = await POST(makePostRequest(noLocation), makeParams());

    expect(response.status).toBe(400);
  });

  it("returns 400 when lat is out of range", async () => {
    const response = await POST(
      makePostRequest({
        ...validBody,
        location: { lat: 91, lng: -97.7431, label: "Nowhere" },
      }),
      makeParams()
    );

    expect(response.status).toBe(400);
  });

  it("returns 400 when lng is out of range", async () => {
    const response = await POST(
      makePostRequest({
        ...validBody,
        location: { lat: 30, lng: 181, label: "Nowhere" },
      }),
      makeParams()
    );

    expect(response.status).toBe(400);
  });

  it("returns 400 when location label is empty", async () => {
    const response = await POST(
      makePostRequest({
        ...validBody,
        location: { lat: 30, lng: -97, label: "" },
      }),
      makeParams()
    );

    expect(response.status).toBe(400);
  });

  // --- Budget validation ---

  it("returns 400 when budget is missing", async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { budget, ...noBudget } = validBody;
    const response = await POST(makePostRequest(noBudget), makeParams());

    expect(response.status).toBe(400);
  });

  it("returns 400 when budget is not a valid enum value", async () => {
    const response = await POST(
      makePostRequest({ ...validBody, budget: "LUXURY" }),
      makeParams()
    );

    expect(response.status).toBe(400);
  });

  // --- Categories validation ---

  it("returns 400 when categories is missing", async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { categories, ...noCategories } = validBody;
    const response = await POST(makePostRequest(noCategories), makeParams());

    expect(response.status).toBe(400);
  });

  it("returns 400 when categories is empty", async () => {
    const response = await POST(
      makePostRequest({ ...validBody, categories: [] }),
      makeParams()
    );

    expect(response.status).toBe(400);
  });

  it("returns 400 when categories has more than 4 items", async () => {
    const response = await POST(
      makePostRequest({
        ...validBody,
        categories: ["RESTAURANT", "BAR", "ACTIVITY", "EVENT", "RESTAURANT"],
      }),
      makeParams()
    );

    expect(response.status).toBe(400);
  });

  it("returns 400 when categories contains an invalid value", async () => {
    const response = await POST(
      makePostRequest({ ...validBody, categories: ["RESTAURANT", "SPA"] }),
      makeParams()
    );

    expect(response.status).toBe(400);
  });

  // --- Session checks ---

  it("returns 404 when session does not exist", async () => {
    mockGetSession.mockResolvedValue(null);

    const response = await POST(makePostRequest(validBody), makeParams());
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBeDefined();
  });

  it("returns 410 when session has expired", async () => {
    // Clock past expiresAt
    vi.setSystemTime(new Date("2026-03-30T12:00:00Z"));

    const response = await POST(makePostRequest(validBody), makeParams());
    const body = await response.json();

    expect(response.status).toBe(410);
    expect(body.error).toBeDefined();
  });

  it("returns 410 when session status is expired", async () => {
    mockGetSession.mockResolvedValue({ ...fakeSession, status: "expired" });

    const response = await POST(makePostRequest(validBody), makeParams());

    expect(response.status).toBe(410);
  });

  // --- Status check ---

  it("returns 409 when session is not in pending_b status", async () => {
    mockGetSession.mockResolvedValue({ ...fakeSession, status: "both_ready" });

    const response = await POST(makePostRequest(validBody), makeParams());
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toContain("not accepting preferences");
  });

  // --- Duplicate check ---

  it("returns 409 when preference already exists for that role", async () => {
    mockGetPreferences.mockResolvedValue([
      { ...fakePreference, role: "b" },
    ]);

    const response = await POST(makePostRequest(validBody), makeParams());
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toBeDefined();
  });

  // --- Race condition: DB unique constraint → 409 ---

  it("returns 409 when DB throws unique constraint violation", async () => {
    mockSubmitPreference.mockRejectedValue(
      new Error("duplicate key value violates unique constraint")
    );

    const response = await POST(makePostRequest(validBody), makeParams());
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toContain("already submitted");
  });

  // --- Unexpected errors ---

  it("returns 500 on unexpected error without leaking details", async () => {
    mockSubmitPreference.mockRejectedValue(
      new Error("connection to DB lost")
    );

    const response = await POST(makePostRequest(validBody), makeParams());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBeDefined();
    expect(body.error).not.toContain("connection");
  });
});

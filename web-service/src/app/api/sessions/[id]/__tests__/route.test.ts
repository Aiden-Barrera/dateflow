import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the session service
const mockGetSession = vi.fn();
vi.mock("../../../../../lib/services/session-service", () => ({
  getSession: (...args: unknown[]) => mockGetSession(...args),
}));

import { GET } from "../route";

// Helper to build a GET request — the URL doesn't matter for our handler,
// the id comes from the params object that Next.js provides separately.
function makeGetRequest(): Request {
  return new Request("http://localhost:3000/api/sessions/abc-123", {
    method: "GET",
  });
}

// Fake session data
const fakeSession = {
  id: "abc-123",
  status: "pending_b",
  creatorDisplayName: "Alex",
  createdAt: new Date("2026-03-27T12:00:00Z"),
  expiresAt: new Date("2026-03-29T12:00:00Z"),
  matchedVenueId: null,
};

describe("GET /api/sessions/[id]", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with the session when found", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-28T12:00:00Z"));
    mockGetSession.mockResolvedValue(fakeSession);

    const request = makeGetRequest();
    const params = Promise.resolve({ id: "abc-123" });
    const response = await GET(request, { params });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.session.id).toBe("abc-123");
    expect(body.session.status).toBe("pending_b");
    expect(body.session.createdAt).toBe("2026-03-27T12:00:00.000Z");
    expect(mockGetSession).toHaveBeenCalledWith("abc-123");
  });

  it("returns 404 when session does not exist", async () => {
    mockGetSession.mockResolvedValue(null);

    const request = makeGetRequest();
    const params = Promise.resolve({ id: "nonexistent" });
    const response = await GET(request, { params });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBeDefined();
  });

  it("returns 410 when session status is expired", async () => {
    const expiredSession = { ...fakeSession, status: "expired" };
    mockGetSession.mockResolvedValue(expiredSession);

    const request = makeGetRequest();
    const params = Promise.resolve({ id: "abc-123" });
    const response = await GET(request, { params });
    const body = await response.json();

    expect(response.status).toBe(410);
    expect(body.error).toBeDefined();
  });

  it("returns 410 when session is past expiresAt even if status is pending_b", async () => {
    // Clock is past expiresAt but status hasn't been updated by pg_cron yet
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-30T12:00:00Z"));
    mockGetSession.mockResolvedValue(fakeSession);

    const request = makeGetRequest();
    const params = Promise.resolve({ id: "abc-123" });
    const response = await GET(request, { params });
    const body = await response.json();

    expect(response.status).toBe(410);
    expect(body.error).toBeDefined();
  });

  it("returns 500 when service throws an unexpected error", async () => {
    mockGetSession.mockRejectedValue(new Error("DB connection lost"));

    const request = makeGetRequest();
    const params = Promise.resolve({ id: "abc-123" });
    const response = await GET(request, { params });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBeDefined();
    expect(body.error).not.toContain("DB connection");
  });
});

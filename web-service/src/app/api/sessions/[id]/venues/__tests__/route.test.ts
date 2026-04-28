import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetSession = vi.fn();
vi.mock("../../../../../../lib/services/session-service", () => ({
  getSession: (...args: unknown[]) => mockGetSession(...args),
}));

const mockGetVenues = vi.fn();
vi.mock("../../../../../../lib/services/venue-generation-service", () => ({
  getVenues: (...args: unknown[]) => mockGetVenues(...args),
}));

const mockGetSwipesForRole = vi.fn();
vi.mock("../../../../../../lib/services/swipe-service", () => ({
  getSwipesForRole: (...args: unknown[]) => mockGetSwipesForRole(...args),
}));

import { GET } from "../route";
import { buildSessionRoleCookieValue } from "../../../../../../lib/session-role-access";

function makeRequest(url = "http://localhost:3000/api/sessions/session-123/venues") {
  return new Request(url, { method: "GET" });
}

function makeParams(id = "session-123") {
  return { params: Promise.resolve({ id }) };
}

const readySession = {
  id: "session-123",
  status: "ready_to_swipe",
  creatorDisplayName: "Alex",
  createdAt: new Date("2026-03-29T10:00:00.000Z"),
  expiresAt: new Date("2026-03-31T10:00:00.000Z"),
  matchedVenueId: null,
};

const fakeVenues = [
  {
    id: "venue-1",
    sessionId: "session-123",
    placeId: "place-1",
    name: "Whisler's",
    category: "BAR",
    address: "1816 E 6th St, Austin, TX",
    lat: 30.26,
    lng: -97.72,
    priceLevel: 2,
    rating: 4.5,
    photoUrl: "https://example.com/photo.jpg",
    tags: ["patio", "conversation-friendly"],
    round: 1,
    position: 1,
    score: {
      categoryOverlap: 1,
      distanceToMidpoint: 0.8,
      firstDateSuitability: 0.9,
      qualitySignal: 0.85,
      timeOfDayFit: 0.9,
    },
  },
];

describe("GET /api/sessions/[id]/venues", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SESSION_ROLE_COOKIE_SECRET = "test-secret";
    mockGetSession.mockResolvedValue(readySession);
    mockGetVenues.mockResolvedValue(fakeVenues);
    mockGetSwipesForRole.mockResolvedValue([]);
  });

  it("returns 200 with venues for a ready session", async () => {
    const response = await GET(makeRequest(), makeParams());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.venues).toEqual(fakeVenues);
    expect(body.viewerSwipedVenueIds).toEqual([]);
    expect(mockGetVenues).toHaveBeenCalledWith("session-123", undefined);
  });

  it("returns already-swiped venue ids for the bound viewer role", async () => {
    mockGetSwipesForRole.mockResolvedValueOnce([
      {
        id: "swipe-1",
        sessionId: "session-123",
        venueId: "venue-1",
        role: "a",
        liked: true,
        createdAt: new Date("2026-04-01T12:00:00Z"),
      },
    ]);
    const cookie = buildSessionRoleCookieValue("session-123", "a").split(";")[0] ?? "";

    const response = await GET(
      new Request("http://localhost:3000/api/sessions/session-123/venues?round=1", {
        headers: { cookie },
      }),
      makeParams(),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.viewerSwipedVenueIds).toEqual(["venue-1"]);
    expect(mockGetSwipesForRole).toHaveBeenCalledWith("session-123", "a");
  });

  it("passes the round filter through when provided", async () => {
    const response = await GET(
      makeRequest("http://localhost:3000/api/sessions/session-123/venues?round=2"),
      makeParams()
    );

    expect(response.status).toBe(200);
    expect(mockGetVenues).toHaveBeenCalledWith("session-123", 2);
  });

  it("returns 400 when round is outside 1-3", async () => {
    const response = await GET(
      makeRequest("http://localhost:3000/api/sessions/session-123/venues?round=4"),
      makeParams()
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Round must be 1, 2, or 3");
    expect(mockGetVenues).not.toHaveBeenCalled();
  });

  it("returns 404 when the session does not exist", async () => {
    mockGetSession.mockResolvedValueOnce(null);

    const response = await GET(makeRequest(), makeParams());
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Session not found");
  });

  it("returns 409 when venues are not ready yet", async () => {
    mockGetSession.mockResolvedValueOnce({
      ...readySession,
      status: "generating",
    });

    const response = await GET(makeRequest(), makeParams());
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toBe("Venues are not ready yet");
    expect(mockGetVenues).not.toHaveBeenCalled();
  });

  it("returns venues for fallback-pending sessions so the no-match ending can resolve its suggestion", async () => {
    mockGetSession.mockResolvedValueOnce({
      ...readySession,
      status: "fallback_pending",
      matchedVenueId: "venue-1",
    });

    const response = await GET(makeRequest(), makeParams());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.venues).toEqual(fakeVenues);
    expect(mockGetVenues).toHaveBeenCalledWith("session-123", undefined);
  });

  it("returns venues for retry-pending sessions so the partner confirmation screen can reopen the fallback pick", async () => {
    mockGetSession.mockResolvedValueOnce({
      ...readySession,
      status: "retry_pending",
      matchedVenueId: "venue-1",
    });

    const response = await GET(makeRequest(), makeParams());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.venues).toEqual(fakeVenues);
    expect(mockGetVenues).toHaveBeenCalledWith("session-123", undefined);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetMatchResult = vi.fn();

vi.mock("../../../../../../lib/services/result-service", () => ({
  getMatchResult: (...args: unknown[]) => mockGetMatchResult(...args),
}));

import { GET } from "../route";

function makeGetRequest(sessionId = "session-1"): Request {
  return new Request(`http://localhost:3000/api/sessions/${sessionId}/result`, {
    method: "GET",
  });
}

describe("GET /api/sessions/[id]/result", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetMatchResult.mockResolvedValue({
      sessionId: "session-1",
      matchedAt: new Date("2026-04-02T18:30:00Z"),
      venue: {
        id: "venue-12",
        sessionId: "session-1",
        placeId: "place-12",
        name: "Cafe Blue",
        category: "RESTAURANT",
        address: "12 Main St",
        lat: 30.26,
        lng: -97.74,
        priceLevel: 2,
        rating: 4.6,
        photoUrl: "https://example.com/photo.jpg",
        tags: ["cozy", "patio"],
        round: 3,
        position: 4,
        score: {
          categoryOverlap: 0.9,
          distanceToMidpoint: 0.8,
          firstDateSuitability: 0.95,
          qualitySignal: 0.85,
          timeOfDayFit: 0.75,
          composite: 0.875,
        },
      },
    });
  });

  it("returns the match result for a valid matched session", async () => {
    const response = await GET(makeGetRequest(), {
      params: Promise.resolve({ id: "session-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockGetMatchResult).toHaveBeenCalledWith("session-1");
    expect(body).toEqual({
      matchResult: {
        sessionId: "session-1",
        matchedAt: "2026-04-02T18:30:00.000Z",
        venue: expect.objectContaining({
          id: "venue-12",
          placeId: "place-12",
          name: "Cafe Blue",
        }),
      },
    });
  });

  it("returns 400 for an empty session id", async () => {
    const response = await GET(makeGetRequest(""), {
      params: Promise.resolve({ id: "   " }),
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Session ID is required");
    expect(mockGetMatchResult).not.toHaveBeenCalled();
  });

  it("returns 404 when the session does not exist", async () => {
    mockGetMatchResult.mockRejectedValue(new Error("Session not found"));

    const response = await GET(makeGetRequest(), {
      params: Promise.resolve({ id: "missing-session" }),
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Session not found");
  });

  it("returns 409 when the session is not matched", async () => {
    mockGetMatchResult.mockRejectedValue(new Error("Session is not matched"));

    const response = await GET(makeGetRequest(), {
      params: Promise.resolve({ id: "session-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toBe("Session is not matched");
  });

  it("returns 404 when the matched venue does not exist", async () => {
    mockGetMatchResult.mockRejectedValue(new Error("Matched venue not found"));

    const response = await GET(makeGetRequest(), {
      params: Promise.resolve({ id: "session-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Matched venue not found");
  });

  it("returns 409 when the matched session is missing a matched venue id", async () => {
    mockGetMatchResult.mockRejectedValue(
      new Error("Session does not have a matched venue"),
    );

    const response = await GET(makeGetRequest(), {
      params: Promise.resolve({ id: "session-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toBe("Session does not have a matched venue");
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetMatchResult = vi.fn();
const mockGenerateICS = vi.fn();

vi.mock("../../../../../../lib/services/result-service", () => ({
  getMatchResult: (...args: unknown[]) => mockGetMatchResult(...args),
}));

vi.mock("../../../../../../lib/services/calendar-export-service", () => ({
  generateICS: (...args: unknown[]) => mockGenerateICS(...args),
}));

import { GET } from "../route";

function makeRequest(query = ""): Request {
  return new Request(
    `http://localhost:3000/api/sessions/session-1/calendar${query}`,
    { method: "GET" },
  );
}

const BASE_MATCH_RESULT = {
  sessionId: "session-1",
  matchedAt: new Date("2026-04-02T18:30:00Z"),
  confirmedDateTime: null,
  venue: {
    id: "venue-12",
    sessionId: "session-1",
    placeId: "place-12",
    name: "Cafe Blue",
    category: "RESTAURANT",
    address: "12 Main St, Austin, TX",
    lat: 30.26,
    lng: -97.74,
    priceLevel: 2,
    rating: 4.6,
    photoUrl: "https://example.com/photo.jpg",
    photoUrls: [],
    sourceType: "places",
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
};

describe("GET /api/sessions/[id]/calendar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetMatchResult.mockResolvedValue(BASE_MATCH_RESULT);
    mockGenerateICS.mockReturnValue("BEGIN:VCALENDAR\r\nEND:VCALENDAR");
  });

  it("returns a downloadable ICS file — calls generateICS with matchResult only", async () => {
    const response = await GET(makeRequest(), {
      params: Promise.resolve({ id: "session-1" }),
    });
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(mockGetMatchResult).toHaveBeenCalledWith("session-1");
    // No override arg — resolution happens inside generateICS
    expect(mockGenerateICS).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: "session-1" }),
    );
    expect(response.headers.get("content-type")).toBe(
      "text/calendar; charset=utf-8",
    );
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="dateflow-plan.ics"',
    );
    expect(body).toBe("BEGIN:VCALENDAR\r\nEND:VCALENDAR");
  });

  it("passes confirmedDateTime from match result through to generateICS", async () => {
    const confirmedAt = new Date("2026-05-04T20:00:00Z");
    mockGetMatchResult.mockResolvedValue({
      ...BASE_MATCH_RESULT,
      confirmedDateTime: confirmedAt,
    });

    const response = await GET(makeRequest(), {
      params: Promise.resolve({ id: "session-1" }),
    });

    expect(response.status).toBe(200);
    expect(mockGenerateICS).toHaveBeenCalledWith(
      expect.objectContaining({ confirmedDateTime: confirmedAt }),
    );
  });

  it("returns 404 when the session does not exist", async () => {
    mockGetMatchResult.mockRejectedValue(new Error("Session not found"));

    const response = await GET(makeRequest(), {
      params: Promise.resolve({ id: "missing-session" }),
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Session not found");
  });

  it("returns 409 when the session is not matched", async () => {
    mockGetMatchResult.mockRejectedValue(new Error("Session is not matched"));

    const response = await GET(makeRequest(), {
      params: Promise.resolve({ id: "session-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toBe("Session is not matched");
  });
});

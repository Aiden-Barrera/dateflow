import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetSession = vi.fn();
const mockGetCurrentRound = vi.fn();
const mockGetRoundCompletion = vi.fn();

vi.mock("../../../../../../lib/services/session-service", () => ({
  getSession: (...args: unknown[]) => mockGetSession(...args),
}));

vi.mock("../../../../../../lib/services/round-manager", () => ({
  getCurrentRound: (...args: unknown[]) => mockGetCurrentRound(...args),
}));

vi.mock("../../../../../../lib/services/swipe-service", () => ({
  getRoundCompletion: (...args: unknown[]) => mockGetRoundCompletion(...args),
}));

import { GET } from "../route";

function makeGetRequest(): Request {
  return new Request("http://localhost:3000/api/sessions/session-1/status", {
    method: "GET",
  });
}

const readySession = {
  id: "session-1",
  status: "ready_to_swipe" as const,
  creatorDisplayName: "Alex",
  createdAt: new Date("2026-04-02T12:00:00Z"),
  expiresAt: new Date("2026-04-04T12:00:00Z"),
  matchedVenueId: null,
};

describe("GET /api/sessions/[id]/status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(readySession);
    mockGetCurrentRound.mockResolvedValue(2);
    mockGetRoundCompletion.mockResolvedValue({
      round: 2,
      roleACount: 3,
      roleBCount: 2,
      total: 4,
      complete: false,
    });
  });

  it("returns the current session status and round progress", async () => {
    const response = await GET(makeGetRequest(), {
      params: Promise.resolve({ id: "session-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockGetCurrentRound).toHaveBeenCalledWith("session-1");
    expect(mockGetRoundCompletion).toHaveBeenCalledWith("session-1", 2);
    expect(body).toEqual({
      status: "ready_to_swipe",
      matchedVenueId: null,
      currentRound: 2,
      roundComplete: false,
    });
  });

  it("returns 404 when the session does not exist", async () => {
    mockGetSession.mockResolvedValue(null);

    const response = await GET(makeGetRequest(), {
      params: Promise.resolve({ id: "session-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Session not found");
  });

  it("returns matched status without querying round progress for terminal sessions", async () => {
    mockGetSession.mockResolvedValue({
      ...readySession,
      status: "matched",
      matchedVenueId: "venue-12",
    });

    const response = await GET(makeGetRequest(), {
      params: Promise.resolve({ id: "session-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockGetCurrentRound).not.toHaveBeenCalled();
    expect(mockGetRoundCompletion).not.toHaveBeenCalled();
    expect(body).toEqual({
      status: "matched",
      matchedVenueId: "venue-12",
      currentRound: undefined,
      roundComplete: undefined,
    });
  });
});

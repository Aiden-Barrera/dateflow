import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildSessionRoleCookieValue } from "../../../../../../lib/session-role-access";

const mockGetSession = vi.fn();
const mockGetCurrentRound = vi.fn();
const mockGetRoundCompletion = vi.fn();
const mockGetPreferences = vi.fn();

vi.mock("../../../../../../lib/services/session-service", () => ({
  getSession: (...args: unknown[]) => mockGetSession(...args),
}));

vi.mock("../../../../../../lib/services/round-manager", () => ({
  getCurrentRound: (...args: unknown[]) => mockGetCurrentRound(...args),
}));

vi.mock("../../../../../../lib/services/swipe-service", () => ({
  getRoundCompletion: (...args: unknown[]) => mockGetRoundCompletion(...args),
}));

vi.mock("../../../../../../lib/services/preference-service", () => ({
  getPreferences: (...args: unknown[]) => mockGetPreferences(...args),
}));

import { GET } from "../route";

function makeGetRequest(cookie?: string): Request {
  return new Request("http://localhost:3000/api/sessions/session-1/status", {
    method: "GET",
    headers: cookie ? { cookie } : undefined,
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
  const originalSessionRoleCookieSecret =
    process.env.SESSION_ROLE_COOKIE_SECRET;

  afterEach(() => {
    vi.useRealTimers();
    process.env.SESSION_ROLE_COOKIE_SECRET = originalSessionRoleCookieSecret;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-03T12:00:00Z"));
    process.env.SESSION_ROLE_COOKIE_SECRET = "test-secret";
    mockGetSession.mockResolvedValue(readySession);
    mockGetPreferences.mockResolvedValue([
      {
        id: "pref-a",
        sessionId: "session-1",
        role: "a",
        location: { lat: 30.28, lng: -97.74, label: "North Austin" },
        budget: "MODERATE",
        categories: ["BAR"],
        createdAt: new Date("2026-04-03T11:00:00Z"),
      },
      {
        id: "pref-b",
        sessionId: "session-1",
        role: "b",
        location: { lat: 30.25, lng: -97.75, label: "South Austin" },
        budget: "UPSCALE",
        categories: ["EVENT", "RESTAURANT"],
        createdAt: new Date("2026-04-03T11:01:00Z"),
      },
    ]);
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
    });
  });

  it("returns active non-swipeable states without round progress", async () => {
    mockGetSession.mockResolvedValue({
      ...readySession,
      status: "generating",
    });

    const response = await GET(makeGetRequest(), {
      params: Promise.resolve({ id: "session-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockGetCurrentRound).not.toHaveBeenCalled();
    expect(mockGetRoundCompletion).not.toHaveBeenCalled();
    expect(body).toEqual({
      status: "generating",
      matchedVenueId: null,
    });
  });

  it("returns viewer-specific retry state so the other participant is not pushed forward prematurely", async () => {
    mockGetSession.mockResolvedValue({
      ...readySession,
      status: "retry_pending",
      retryInitiatorRole: "a",
      retryAConfirmedAt: new Date("2026-04-03T11:55:00Z"),
      retryBConfirmedAt: null,
    });

    const cookie = buildSessionRoleCookieValue("session-1", "b").split(";")[0];
    const response = await GET(makeGetRequest(cookie), {
      params: Promise.resolve({ id: "session-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockGetCurrentRound).not.toHaveBeenCalled();
    expect(mockGetRoundCompletion).not.toHaveBeenCalled();
    expect(body).toEqual({
      status: "retry_pending",
      matchedVenueId: null,
      retryState: {
        initiatorRole: "a",
        viewerRole: "b",
        viewerHasConfirmed: false,
        partnerHasConfirmed: true,
        initiatedByPartner: true,
        viewerPreferences: {
          categories: ["EVENT", "RESTAURANT"],
          budget: "UPSCALE",
        },
      },
    });
  });

  it("returns expired status when the session has passed expiresAt even if DB status has not flipped yet", async () => {
    mockGetSession.mockResolvedValue({
      ...readySession,
      expiresAt: new Date("2026-04-02T12:00:00Z"),
      status: "ready_to_swipe",
    });

    const response = await GET(makeGetRequest(), {
      params: Promise.resolve({ id: "session-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockGetCurrentRound).not.toHaveBeenCalled();
    expect(mockGetRoundCompletion).not.toHaveBeenCalled();
    expect(body).toEqual({
      status: "expired",
      matchedVenueId: null,
    });
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockGetSession = vi.fn();
const mockGetCurrentRound = vi.fn();
const mockGetRoundCompletion = vi.fn();
const mockReadBoundSessionRole = vi.fn();
const mockShouldWaitForPartnerRetryConfirmation = vi.fn();

vi.mock("../../../../../../lib/services/session-service", () => ({
  getSession: (...args: unknown[]) => mockGetSession(...args),
}));

vi.mock("../../../../../../lib/services/round-manager", () => ({
  getCurrentRound: (...args: unknown[]) => mockGetCurrentRound(...args),
}));

vi.mock("../../../../../../lib/services/swipe-service", () => ({
  getRoundCompletion: (...args: unknown[]) => mockGetRoundCompletion(...args),
}));

vi.mock("../../../../../../lib/session-role-access", () => ({
  readBoundSessionRole: (...args: unknown[]) => mockReadBoundSessionRole(...args),
}));

vi.mock("../../../../../../lib/services/fallback-decision-service", () => ({
  shouldWaitForPartnerRetryConfirmation: (...args: unknown[]) =>
    mockShouldWaitForPartnerRetryConfirmation(...args),
}));

import { GET } from "../route";

function makeGetRequest(): Request {
  return new Request("http://localhost:3000/api/sessions/session-1/status", {
    method: "GET",
    headers: { cookie: "test-cookie=value" },
  });
}

const readySession = {
  id: "session-1",
  status: "ready_to_swipe" as const,
  creatorDisplayName: "Alex",
  inviteeDisplayName: null,
  createdAt: new Date("2026-04-02T12:00:00Z"),
  expiresAt: new Date("2026-04-04T12:00:00Z"),
  matchedVenueId: null,
  matchedAt: null,
  retryInitiatorRole: null,
  retryAConfirmedAt: null,
  retryBConfirmedAt: null,
  retryAPreferences: null,
  retryBPreferences: null,
};

describe("GET /api/sessions/[id]/status", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-03T12:00:00Z"));
    mockReadBoundSessionRole.mockReturnValue("a");
    mockShouldWaitForPartnerRetryConfirmation.mockReturnValue(false);
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
      viewerRoundComplete: false,
    });
  });

  it('returns viewerRoundComplete true for role "a" when role A has swiped all venues', async () => {
    mockReadBoundSessionRole.mockReturnValue("a");
    mockGetRoundCompletion.mockResolvedValue({
      round: 2,
      roleACount: 4,
      roleBCount: 2,
      total: 4,
      complete: false,
    });

    const response = await GET(makeGetRequest(), {
      params: Promise.resolve({ id: "session-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      status: "ready_to_swipe",
      matchedVenueId: null,
      currentRound: 2,
      roundComplete: false,
      viewerRoundComplete: true,
    });
  });

  it('returns viewerRoundComplete true for role "b" when role B has swiped all venues', async () => {
    mockReadBoundSessionRole.mockReturnValue("b");
    mockGetRoundCompletion.mockResolvedValue({
      round: 2,
      roleACount: 3,
      roleBCount: 4,
      total: 4,
      complete: false,
    });

    const response = await GET(makeGetRequest(), {
      params: Promise.resolve({ id: "session-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      status: "ready_to_swipe",
      matchedVenueId: null,
      currentRound: 2,
      roundComplete: false,
      viewerRoundComplete: true,
    });
  });

  it("keeps viewerRoundComplete false when total is zero", async () => {
    mockGetRoundCompletion.mockResolvedValue({
      round: 2,
      roleACount: 0,
      roleBCount: 0,
      total: 0,
      complete: false,
    });

    const response = await GET(makeGetRequest(), {
      params: Promise.resolve({ id: "session-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      status: "ready_to_swipe",
      matchedVenueId: null,
      currentRound: 2,
      roundComplete: false,
      viewerRoundComplete: false,
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

  it("returns fallback_pending plus a retry-waiting flag for the confirming user", async () => {
    mockGetSession.mockResolvedValue({
      ...readySession,
      status: "fallback_pending",
      matchedVenueId: "venue-12",
    });
    mockShouldWaitForPartnerRetryConfirmation.mockReturnValue(true);

    const response = await GET(makeGetRequest(), {
      params: Promise.resolve({ id: "session-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      status: "fallback_pending",
      matchedVenueId: "venue-12",
      retryWaitingForPartner: true,
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

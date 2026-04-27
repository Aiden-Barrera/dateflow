import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAcceptFallbackSuggestion = vi.fn();
const mockRequestFallbackRetry = vi.fn();
const mockReadBoundSessionRole = vi.fn();
const mockShouldWaitForPartnerRetryConfirmation = vi.fn();
const mockShouldWaitForPartnerAcceptConfirmation = vi.fn();
const mockIsRetryInProgress = vi.fn();
const mockHasPartnerInitiatedAccept = vi.fn();
const mockGetSession = vi.fn();

vi.mock("../../../../../../lib/services/fallback-decision-service", () => ({
  acceptFallbackSuggestion: (...args: unknown[]) =>
    mockAcceptFallbackSuggestion(...args),
  requestFallbackRetry: (...args: unknown[]) => mockRequestFallbackRetry(...args),
  shouldWaitForPartnerRetryConfirmation: (...args: unknown[]) =>
    mockShouldWaitForPartnerRetryConfirmation(...args),
  shouldWaitForPartnerAcceptConfirmation: (...args: unknown[]) =>
    mockShouldWaitForPartnerAcceptConfirmation(...args),
  isRetryInProgress: (...args: unknown[]) => mockIsRetryInProgress(...args),
  hasPartnerInitiatedAccept: (...args: unknown[]) =>
    mockHasPartnerInitiatedAccept(...args),
}));

vi.mock("../../../../../../lib/services/session-service", () => ({
  getSession: (...args: unknown[]) => mockGetSession(...args),
}));

vi.mock("../../../../../../lib/session-role-access", () => ({
  readBoundSessionRole: (...args: unknown[]) => mockReadBoundSessionRole(...args),
}));

import { POST } from "../route";

function makePostRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/sessions/session-1/fallback", {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: "test-cookie=value" },
    body: JSON.stringify(body),
  });
}

const matchedSession = {
  id: "session-1",
  status: "matched",
  creatorDisplayName: "Alex",
  inviteeDisplayName: null,
  createdAt: new Date("2026-04-02T12:00:00Z"),
  expiresAt: new Date("2026-04-04T12:00:00Z"),
  matchedVenueId: "venue-12",
  matchedAt: new Date("2026-04-03T12:00:00Z"),
  retryInitiatorRole: null,
  retryAConfirmedAt: null,
  retryBConfirmedAt: null,
  retryAPreferences: null,
  retryBPreferences: null,
  acceptAConfirmedAt: null,
  acceptBConfirmedAt: null,
};

const rerankedSession = {
  ...matchedSession,
  status: "fallback_pending" as const,
  matchedVenueId: "venue-12",
  matchedAt: null,
};

describe("POST /api/sessions/[id]/fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReadBoundSessionRole.mockReturnValue("a");
    mockShouldWaitForPartnerRetryConfirmation.mockReturnValue(true);
    mockShouldWaitForPartnerAcceptConfirmation.mockReturnValue(false);
    mockIsRetryInProgress.mockReturnValue(false);
    mockHasPartnerInitiatedAccept.mockReturnValue(false);
    mockGetSession.mockResolvedValue(matchedSession);
  });

  it("accepts the suggested fallback venue", async () => {
    mockAcceptFallbackSuggestion.mockResolvedValue(matchedSession);

    const response = await POST(makePostRequest({ action: "accept" }), {
      params: Promise.resolve({ id: "session-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockAcceptFallbackSuggestion).toHaveBeenCalledWith("session-1", "a");
    expect(body.session.status).toBe("matched");
    expect(body.session.matchedVenueId).toBe("venue-12");
  });

  it("requests a retry using the bound session role", async () => {
    mockRequestFallbackRetry.mockResolvedValue(rerankedSession);

    const response = await POST(
      makePostRequest({
        action: "retry",
        preferences: {
          categories: ["BAR", "ACTIVITY"],
          budget: "UPSCALE",
        },
      }),
      {
        params: Promise.resolve({ id: "session-1" }),
      },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockRequestFallbackRetry).toHaveBeenCalledWith("session-1", "a", {
      categories: ["BAR", "ACTIVITY"],
      budget: "UPSCALE",
    });
    expect(body.session.status).toBe("fallback_pending");
    expect(body.retryWaitingForPartner).toBe(true);
  });

  it("returns 403 when no bound session role is present", async () => {
    mockReadBoundSessionRole.mockReturnValue(null);

    const response = await POST(makePostRequest({ action: "accept" }), {
      params: Promise.resolve({ id: "session-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toContain("role-bound access");
  });

  it("returns 400 when retry is missing preference adjustments", async () => {
    const response = await POST(makePostRequest({ action: "retry" }), {
      params: Promise.resolve({ id: "session-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("preferences");
  });

  it("returns 400 for an unsupported action", async () => {
    const response = await POST(makePostRequest({ action: "ignore" }), {
      params: Promise.resolve({ id: "session-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("action");
  });

  it("returns 404 when the fallback service reports the session is missing", async () => {
    mockAcceptFallbackSuggestion.mockRejectedValueOnce(new Error("Session not found"));

    const response = await POST(makePostRequest({ action: "accept" }), {
      params: Promise.resolve({ id: "session-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Session not found");
  });

  it("returns 500 when the fallback service throws an unexpected error", async () => {
    mockRequestFallbackRetry.mockRejectedValueOnce(
      new Error("duplicate key value violates unique constraint"),
    );

    const response = await POST(
      makePostRequest({
        action: "retry",
        preferences: {
          categories: ["BAR", "ACTIVITY"],
          budget: "UPSCALE",
        },
      }),
      {
        params: Promise.resolve({ id: "session-1" }),
      },
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Something went wrong. Please try again.");
  });
});

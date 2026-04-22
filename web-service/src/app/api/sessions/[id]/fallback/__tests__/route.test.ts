import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildSessionRoleCookieValue } from "../../../../../../lib/session-role-access";

const mockAcceptFallbackSuggestion = vi.fn();
const mockRequestFallbackRetry = vi.fn();

vi.mock("../../../../../../lib/services/fallback-decision-service", () => ({
  acceptFallbackSuggestion: (...args: unknown[]) =>
    mockAcceptFallbackSuggestion(...args),
  requestFallbackRetry: (...args: unknown[]) => mockRequestFallbackRetry(...args),
}));

import { POST } from "../route";

function makePostRequest(body: unknown, cookie?: string): Request {
  return new Request("http://localhost:3000/api/sessions/session-1/fallback", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

const matchedSession = {
  id: "session-1",
  status: "matched",
  creatorDisplayName: "Alex",
  createdAt: new Date("2026-04-02T12:00:00Z"),
  expiresAt: new Date("2026-04-04T12:00:00Z"),
  matchedVenueId: "venue-12",
};

const rerankedSession = {
  ...matchedSession,
  status: "ready_to_swipe" as const,
  matchedVenueId: null,
};

describe("POST /api/sessions/[id]/fallback", () => {
  const originalSessionRoleCookieSecret =
    process.env.SESSION_ROLE_COOKIE_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SESSION_ROLE_COOKIE_SECRET = "test-secret";
  });

  afterEach(() => {
    process.env.SESSION_ROLE_COOKIE_SECRET = originalSessionRoleCookieSecret;
  });

  it("accepts the suggested fallback venue", async () => {
    mockAcceptFallbackSuggestion.mockResolvedValue(matchedSession);

    const response = await POST(makePostRequest({ action: "accept" }), {
      params: Promise.resolve({ id: "session-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockAcceptFallbackSuggestion).toHaveBeenCalledWith("session-1");
    expect(body.session.status).toBe("matched");
    expect(body.session.matchedVenueId).toBe("venue-12");
  });

  it("requests a retry from fallback pending", async () => {
    mockRequestFallbackRetry.mockResolvedValue(rerankedSession);
    const cookie = buildSessionRoleCookieValue("session-1", "b").split(";")[0];

    const response = await POST(
      makePostRequest({
        action: "retry",
        preferences: {
          categories: ["BAR", "ACTIVITY"],
          budget: "UPSCALE",
        },
      }, cookie),
      {
      params: Promise.resolve({ id: "session-1" }),
      },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockRequestFallbackRetry).toHaveBeenCalledWith(
      "session-1",
      "b",
      {
        categories: ["BAR", "ACTIVITY"],
        budget: "UPSCALE",
      },
    );
    expect(body.session.status).toBe("ready_to_swipe");
  });

  it("returns 403 when retry is attempted without a bound session role", async () => {
    const response = await POST(
      makePostRequest({
        action: "retry",
        preferences: {
          categories: ["BAR"],
          budget: "MODERATE",
        },
      }),
      {
        params: Promise.resolve({ id: "session-1" }),
      },
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toContain("role-bound access");
    expect(mockRequestFallbackRetry).not.toHaveBeenCalled();
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

  it("returns 500 when the fallback service throws an unexpected database error", async () => {
    mockRequestFallbackRetry.mockRejectedValueOnce(new Error("duplicate key value violates unique constraint"));
    const cookie = buildSessionRoleCookieValue("session-1", "a").split(";")[0];

    const response = await POST(
      makePostRequest({
        action: "retry",
        preferences: {
          categories: ["BAR", "ACTIVITY"],
          budget: "UPSCALE",
        },
      }, cookie),
      {
        params: Promise.resolve({ id: "session-1" }),
      },
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Something went wrong. Please try again.");
  });
});

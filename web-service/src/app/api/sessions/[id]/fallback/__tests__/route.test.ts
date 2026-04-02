import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAcceptFallbackSuggestion = vi.fn();
const mockRequestFallbackRetry = vi.fn();

vi.mock("../../../../../../lib/services/fallback-decision-service", () => ({
  acceptFallbackSuggestion: (...args: unknown[]) =>
    mockAcceptFallbackSuggestion(...args),
  requestFallbackRetry: (...args: unknown[]) => mockRequestFallbackRetry(...args),
}));

import { POST } from "../route";

function makePostRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/sessions/session-1/fallback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
  beforeEach(() => {
    vi.clearAllMocks();
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
    expect(mockRequestFallbackRetry).toHaveBeenCalledWith("session-1", {
      categories: ["BAR", "ACTIVITY"],
      budget: "UPSCALE",
    });
    expect(body.session.status).toBe("ready_to_swipe");
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
});

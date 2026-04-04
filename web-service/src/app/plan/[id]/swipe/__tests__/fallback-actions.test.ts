import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  acceptFallbackDecision,
  getFallbackStartOverHref,
  requestFallbackRetryDecision,
} from "../fallback-actions";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("acceptFallbackDecision", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("posts the accept action to the fallback route and returns the matched status", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        session: {
          status: "matched",
          matchedVenueId: "venue-12",
        },
      }),
    });

    const result = await acceptFallbackDecision("session-1");

    expect(mockFetch).toHaveBeenCalledWith("/api/sessions/session-1/fallback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "accept" }),
    });
    expect(result).toEqual({
      status: "matched",
      matchedVenueId: "venue-12",
    });
  });

  it("throws the API error when the accept request fails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Session is not waiting on a fallback decision" }),
    });

    await expect(acceptFallbackDecision("session-1")).rejects.toThrow(
      "Session is not waiting on a fallback decision",
    );
  });
});

describe("requestFallbackRetryDecision", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("posts retry preferences to the fallback route and returns the next session state", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        session: {
          status: "ready_to_swipe",
          matchedVenueId: null,
        },
      }),
    });

    const result = await requestFallbackRetryDecision("session-1", {
      categories: ["BAR", "ACTIVITY"],
      budget: "UPSCALE",
    });

    expect(mockFetch).toHaveBeenCalledWith("/api/sessions/session-1/fallback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "retry",
        preferences: {
          categories: ["BAR", "ACTIVITY"],
          budget: "UPSCALE",
        },
      }),
    });
    expect(result).toEqual({
      status: "ready_to_swipe",
      matchedVenueId: null,
    });
  });
});

describe("getFallbackStartOverHref", () => {
  it("sends users back to the app entry point", () => {
    expect(getFallbackStartOverHref()).toBe("/");
  });
});

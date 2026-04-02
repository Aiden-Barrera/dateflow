import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockGetSession = vi.fn();
const mockRecordSwipe = vi.fn();

vi.mock("../../../../../../lib/services/session-service", () => ({
  getSession: (...args: unknown[]) => mockGetSession(...args),
}));

vi.mock("../../../../../../lib/services/swipe-service", () => ({
  recordSwipe: (...args: unknown[]) => mockRecordSwipe(...args),
}));

import { POST } from "../route";

function makePostRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/sessions/session-1/swipes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
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

describe("POST /api/sessions/[id]/swipes", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-03T12:00:00Z"));
    mockGetSession.mockResolvedValue(readySession);
    mockRecordSwipe.mockResolvedValue({
      matched: false,
      matchedVenueId: null,
      roundComplete: false,
      currentRound: 1,
      sessionStatus: "ready_to_swipe",
    });
  });

  it("records a swipe when the request is valid", async () => {
    const response = await POST(makePostRequest({
      venueId: "venue-1",
      role: "a",
      liked: true,
    }), {
      params: Promise.resolve({ id: "session-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockRecordSwipe).toHaveBeenCalledWith(
      "session-1",
      "venue-1",
      "a",
      true,
    );
    expect(body).toEqual({
      matched: false,
      matchedVenueId: null,
      roundComplete: false,
      currentRound: 1,
      sessionStatus: "ready_to_swipe",
    });
  });

  it("returns 400 when the request body is invalid", async () => {
    const response = await POST(makePostRequest({
      venueId: 123,
      role: "c",
      liked: "yes",
    }), {
      params: Promise.resolve({ id: "session-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBeDefined();
    expect(mockRecordSwipe).not.toHaveBeenCalled();
  });

  it("returns 404 when the session does not exist", async () => {
    mockGetSession.mockResolvedValue(null);

    const response = await POST(makePostRequest({
      venueId: "venue-1",
      role: "a",
      liked: true,
    }), {
      params: Promise.resolve({ id: "session-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Session not found");
  });

  it("returns 409 when the session is not accepting swipes", async () => {
    mockGetSession.mockResolvedValue({
      ...readySession,
      status: "generating",
    });

    const response = await POST(makePostRequest({
      venueId: "venue-1",
      role: "a",
      liked: true,
    }), {
      params: Promise.resolve({ id: "session-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toContain("not accepting swipes");
    expect(mockRecordSwipe).not.toHaveBeenCalled();
  });

  it("returns 409 when the session is awaiting a fallback decision", async () => {
    mockGetSession.mockResolvedValue({
      ...readySession,
      status: "fallback_pending",
      matchedVenueId: "venue-12",
    });

    const response = await POST(makePostRequest({
      venueId: "venue-1",
      role: "a",
      liked: true,
    }), {
      params: Promise.resolve({ id: "session-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toContain("fallback decision");
    expect(mockRecordSwipe).not.toHaveBeenCalled();
  });

  it("returns 400 when recordSwipe reports a bad venue or current round error", async () => {
    mockRecordSwipe.mockRejectedValue(
      new Error("Venue venue-9 is not in the current round"),
    );

    const response = await POST(makePostRequest({
      venueId: "venue-9",
      role: "a",
      liked: true,
    }), {
      params: Promise.resolve({ id: "session-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("current round");
  });

  it("returns 409 when recordSwipe reports an invalid session state", async () => {
    mockRecordSwipe.mockRejectedValue(
      new Error("cannot swipe when session status is generating"),
    );

    const response = await POST(makePostRequest({
      venueId: "venue-1",
      role: "a",
      liked: true,
    }), {
      params: Promise.resolve({ id: "session-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toContain("session status");
  });
});

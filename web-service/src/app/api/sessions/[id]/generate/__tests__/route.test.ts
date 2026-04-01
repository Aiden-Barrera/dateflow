import { beforeEach, describe, expect, it, vi } from "vitest";

const mockVerifyQstashRequest = vi.fn();
vi.mock("../../../../../../lib/qstash", () => ({
  verifyQstashRequest: (...args: unknown[]) => mockVerifyQstashRequest(...args),
}));

const mockGetSession = vi.fn();
vi.mock("../../../../../../lib/services/session-service", () => ({
  getSession: (...args: unknown[]) => mockGetSession(...args),
}));

const mockGenerateVenues = vi.fn();
vi.mock("../../../../../../lib/services/venue-generation-service", () => ({
  generateVenues: (...args: unknown[]) => mockGenerateVenues(...args),
}));

import { POST } from "../route";

function makeRequest(body: unknown = { sessionId: "session-123" }) {
  return new Request("http://localhost:3000/api/sessions/session-123/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Upstash-Signature": "test-signature",
    },
    body: JSON.stringify(body),
  });
}

function makeParams(id = "session-123") {
  return { params: Promise.resolve({ id }) };
}

describe("POST /api/sessions/[id]/generate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyQstashRequest.mockResolvedValue(true);
    mockGetSession.mockResolvedValue({
      id: "session-123",
      status: "both_ready",
      creatorDisplayName: "Alex",
      createdAt: new Date("2026-04-01T10:00:00Z"),
      expiresAt: new Date("2026-04-03T10:00:00Z"),
      matchedVenueId: null,
    });
    mockGenerateVenues.mockResolvedValue([]);
  });

  it("returns 202 and starts generation for a both_ready session", async () => {
    const response = await POST(makeRequest(), makeParams());
    const body = await response.json();

    expect(response.status).toBe(202);
    expect(body.status).toBe("generating");
    expect(mockGenerateVenues).toHaveBeenCalledWith("session-123");
  });

  it("allows retries from generation_failed", async () => {
    mockGetSession.mockResolvedValueOnce({
      id: "session-123",
      status: "generation_failed",
      creatorDisplayName: "Alex",
      createdAt: new Date("2026-04-01T10:00:00Z"),
      expiresAt: new Date("2026-04-03T10:00:00Z"),
      matchedVenueId: null,
    });

    const response = await POST(makeRequest(), makeParams());

    expect(response.status).toBe(202);
    expect(mockGenerateVenues).toHaveBeenCalledWith("session-123");
  });

  it("returns 401 when the QStash signature is invalid", async () => {
    mockVerifyQstashRequest.mockResolvedValueOnce(false);

    const response = await POST(makeRequest(), makeParams());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
    expect(mockGenerateVenues).not.toHaveBeenCalled();
  });

  it("returns 404 when the session does not exist", async () => {
    mockGetSession.mockResolvedValueOnce(null);

    const response = await POST(makeRequest(), makeParams());
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Session not found");
  });

  it("returns 400 when the session is not ready to generate", async () => {
    mockGetSession.mockResolvedValueOnce({
      id: "session-123",
      status: "pending_b",
      creatorDisplayName: "Alex",
      createdAt: new Date("2026-04-01T10:00:00Z"),
      expiresAt: new Date("2026-04-03T10:00:00Z"),
      matchedVenueId: null,
    });

    const response = await POST(makeRequest(), makeParams());
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Session is not ready for venue generation");
    expect(mockGenerateVenues).not.toHaveBeenCalled();
  });
});

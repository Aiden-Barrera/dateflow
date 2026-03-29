import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock the services — we're testing the HTTP layer, not business logic again
// ---------------------------------------------------------------------------
const mockCreateSession = vi.fn();
vi.mock("../../../../lib/services/session-service", () => ({
  createSession: (...args: unknown[]) => mockCreateSession(...args),
}));

const mockGenerateShareLink = vi.fn();
vi.mock("../../../../lib/services/share-link-service", () => ({
  generateShareLink: (...args: unknown[]) => mockGenerateShareLink(...args),
}));

// Import the route handler AFTER mocks are set up
import { POST } from "../route";

// Helpers to build fake Request objects
function makePostRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeInvalidRequest(): Request {
  return new Request("http://localhost:3000/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "not valid json{{{",
  });
}

// Fake data the mocks return
const fakeSession = {
  id: "abc-123",
  status: "pending_b",
  creatorDisplayName: "Alex",
  createdAt: new Date("2026-03-27T12:00:00Z"),
  expiresAt: new Date("2026-03-29T12:00:00Z"),
  matchedVenueId: null,
};

const fakeShareLink = {
  sessionId: "abc-123",
  url: "https://dateflow.app/plan/abc-123",
  expiresAt: new Date("2026-03-29T12:00:00Z"),
};

describe("POST /api/sessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateSession.mockResolvedValue(fakeSession);
    mockGenerateShareLink.mockReturnValue(fakeShareLink);
  });

  it("returns 201 with session and share link on success", async () => {
    const request = makePostRequest({ creatorDisplayName: "Alex" });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.session.id).toBe("abc-123");
    expect(body.session.status).toBe("pending_b");
    expect(body.session.creatorDisplayName).toBe("Alex");
    expect(body.session.createdAt).toBe("2026-03-27T12:00:00.000Z");
    expect(body.shareLink.url).toBe("https://dateflow.app/plan/abc-123");
    expect(body.shareLink.expiresAt).toBe("2026-03-29T12:00:00.000Z");
  });

  it("calls createSession with the provided display name", async () => {
    const request = makePostRequest({ creatorDisplayName: "Alex" });
    await POST(request);

    expect(mockCreateSession).toHaveBeenCalledWith("Alex");
  });

  it("returns 400 when creatorDisplayName is missing from body", async () => {
    const request = makePostRequest({});
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBeDefined();
  });

  it("returns 400 when request body is not valid JSON", async () => {
    const request = makeInvalidRequest();
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBeDefined();
  });

  it("returns 500 when service throws an unexpected error", async () => {
    mockCreateSession.mockRejectedValue(new Error("DB connection lost"));

    const request = makePostRequest({ creatorDisplayName: "Alex" });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBeDefined();
    // Should NOT leak the internal error message
    expect(body.error).not.toContain("DB connection");
  });
});

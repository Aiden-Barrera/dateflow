import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateShareLink, validateShareLink } from "../share-link-service";

// Mock the session service — validateShareLink delegates to it
const mockValidateSessionForJoin = vi.fn();
vi.mock("../session-service", () => ({
  validateSessionForJoin: (...args: unknown[]) =>
    mockValidateSessionForJoin(...args),
}));

describe("generateShareLink", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("generates a share link with the correct URL format", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://dateflow.app");
    const expiresAt = new Date("2026-03-29T12:00:00Z");

    const link = generateShareLink("abc-123", expiresAt);

    expect(link.url).toBe("https://dateflow.app/plan/abc-123");
    expect(link.sessionId).toBe("abc-123");
  });

  it("uses NEXT_PUBLIC_APP_URL from environment", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    const expiresAt = new Date("2026-03-29T12:00:00Z");

    const link = generateShareLink("xyz-456", expiresAt);

    expect(link.url).toBe("http://localhost:3000/plan/xyz-456");
  });

  it("throws when NEXT_PUBLIC_APP_URL is missing", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");

    expect(() =>
      generateShareLink("abc-123", new Date("2026-03-29T12:00:00Z"))
    ).toThrow("NEXT_PUBLIC_APP_URL");
  });

  it("sets expiresAt from the provided date", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://dateflow.app");
    const expiresAt = new Date("2026-03-29T12:00:00Z");

    const link = generateShareLink("abc-123", expiresAt);

    expect(link.expiresAt).toEqual(expiresAt);
  });
});

describe("validateShareLink", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when session is joinable", async () => {
    mockValidateSessionForJoin.mockResolvedValue({
      id: "abc-123",
      status: "pending_b",
    });

    const result = await validateShareLink("abc-123");

    expect(result).toBe(true);
    expect(mockValidateSessionForJoin).toHaveBeenCalledWith("abc-123");
  });

  it("returns false when session is not joinable", async () => {
    mockValidateSessionForJoin.mockRejectedValue(
      new Error("Session has expired")
    );

    const result = await validateShareLink("abc-123");

    expect(result).toBe(false);
  });
});

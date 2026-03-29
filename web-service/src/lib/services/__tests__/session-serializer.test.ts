import { describe, it, expect } from "vitest";
import { serializeSession } from "../session-serializer";
import type { Session } from "../../types/session";

const testSession: Session = {
  id: "abc-123",
  status: "pending_b",
  creatorDisplayName: "Alex",
  createdAt: new Date("2026-03-27T12:00:00Z"),
  expiresAt: new Date("2026-03-29T12:00:00Z"),
  matchedVenueId: null,
};

describe("serializeSession", () => {
  it("converts Date fields to ISO strings", () => {
    const result = serializeSession(testSession);

    expect(result.createdAt).toBe("2026-03-27T12:00:00.000Z");
    expect(result.expiresAt).toBe("2026-03-29T12:00:00.000Z");
    expect(typeof result.createdAt).toBe("string");
    expect(typeof result.expiresAt).toBe("string");
  });

  it("preserves non-Date fields as-is", () => {
    const result = serializeSession(testSession);

    expect(result.id).toBe("abc-123");
    expect(result.status).toBe("pending_b");
    expect(result.creatorDisplayName).toBe("Alex");
  });

  it("handles null matchedVenueId", () => {
    const result = serializeSession(testSession);
    expect(result.matchedVenueId).toBeNull();
  });

  it("handles non-null matchedVenueId", () => {
    const sessionWithVenue: Session = {
      ...testSession,
      matchedVenueId: "venue-xyz",
    };
    const result = serializeSession(sessionWithVenue);
    expect(result.matchedVenueId).toBe("venue-xyz");
  });
});

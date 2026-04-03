import { describe, it, expect, vi, afterEach } from "vitest";
import { isExpired } from "../session-helpers";
import type { Session } from "../../types/session";

// A reusable session factory — we override only the fields each test cares about.
function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: "test-session-id",
    status: "pending_b",
    creatorDisplayName: "Alex",
    createdAt: new Date("2026-03-27T12:00:00Z"),
    expiresAt: new Date("2026-03-29T12:00:00Z"),
    matchedVenueId: null,
    matchedAt: null,
    ...overrides,
  };
}

describe("isExpired", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns false when session has not expired", () => {
    // "Now" is March 28 — one day before the March 29 expiry
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-28T12:00:00Z"));

    const session = makeSession();
    expect(isExpired(session)).toBe(false);
  });

  it("returns true when session is past expiresAt", () => {
    // "Now" is March 30 — one day after the March 29 expiry
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-30T12:00:00Z"));

    const session = makeSession();
    expect(isExpired(session)).toBe(true);
  });

  it("returns true when session is exactly at expiresAt", () => {
    // "Now" is exactly the expiry moment — we treat this as expired
    // (expired means "at or past", not "strictly past")
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-29T12:00:00Z"));

    const session = makeSession();
    expect(isExpired(session)).toBe(true);
  });
});

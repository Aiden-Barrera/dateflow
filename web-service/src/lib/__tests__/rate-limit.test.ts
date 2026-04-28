import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkRateLimit,
  resetRateLimitStoreForTests,
} from "../rate-limit";

function requestFor(ip: string): Request {
  return new Request("http://localhost:3000/api/sessions", {
    headers: { "x-forwarded-for": ip },
  });
}

describe("checkRateLimit", () => {
  beforeEach(() => {
    resetRateLimitStoreForTests();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-28T12:00:00Z"));
  });

  it("allows requests while an IP is under the route limit", () => {
    expect(
      checkRateLimit(requestFor("203.0.113.1"), {
        key: "sessions:create",
        limit: 2,
        windowMs: 60_000,
      }),
    ).toBeNull();
    expect(
      checkRateLimit(requestFor("203.0.113.1"), {
        key: "sessions:create",
        limit: 2,
        windowMs: 60_000,
      }),
    ).toBeNull();
  });

  it("returns a 429 response once the same IP exceeds the route limit", async () => {
    checkRateLimit(requestFor("203.0.113.1"), {
      key: "sessions:create",
      limit: 1,
      windowMs: 60_000,
    });

    const response = checkRateLimit(requestFor("203.0.113.1"), {
      key: "sessions:create",
      limit: 1,
      windowMs: 60_000,
    });

    expect(response?.status).toBe(429);
    await expect(response?.json()).resolves.toEqual({
      error: "Rate limit exceeded",
    });
    expect(response?.headers.get("Retry-After")).toBe("60");
  });

  it("resets counts after the configured window passes", () => {
    checkRateLimit(requestFor("203.0.113.1"), {
      key: "sessions:create",
      limit: 1,
      windowMs: 60_000,
    });

    vi.advanceTimersByTime(60_001);

    expect(
      checkRateLimit(requestFor("203.0.113.1"), {
        key: "sessions:create",
        limit: 1,
        windowMs: 60_000,
      }),
    ).toBeNull();
  });

  it("tracks different route keys independently", () => {
    checkRateLimit(requestFor("203.0.113.1"), {
      key: "sessions:create",
      limit: 1,
      windowMs: 60_000,
    });

    expect(
      checkRateLimit(requestFor("203.0.113.1"), {
        key: "sessions:status",
        limit: 1,
        windowMs: 60_000,
      }),
    ).toBeNull();
  });
});

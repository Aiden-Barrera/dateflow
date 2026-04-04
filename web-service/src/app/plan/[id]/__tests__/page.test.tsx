import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildSessionRoleCookieValue } from "../../../../lib/session-role-access";

const mockGetSession = vi.fn();
const mockCookies = vi.fn();
const mockNotFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
const mockRedirect = vi.fn((href: string) => {
  throw new Error(`NEXT_REDIRECT:${href}`);
});

vi.mock("../../../../lib/services/session-service", () => ({
  getSession: (...args: unknown[]) => mockGetSession(...args),
}));

vi.mock("next/navigation", () => ({
  notFound: () => mockNotFound(),
  redirect: (href: string) => mockRedirect(href),
}));

vi.mock("next/headers", () => ({
  cookies: () => mockCookies(),
}));

import PlanPage from "../page";

describe("/plan/[id] page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SESSION_ROLE_COOKIE_SECRET = "test-secret";
    mockCookies.mockResolvedValue({
      get: () => ({
        value: buildSessionRoleCookieValue("session-1", "b").split(";")[0]?.split("=")[1],
      }),
    });
  });

  it("redirects matched sessions to the result page", async () => {
    mockGetSession.mockResolvedValue({
      id: "session-1",
      status: "matched",
      creatorDisplayName: "Alex",
      createdAt: new Date("2026-04-02T18:30:00Z"),
      expiresAt: new Date("2026-04-06T18:30:00Z"),
      matchedVenueId: "venue-12",
    });

    await expect(
      PlanPage({
        params: Promise.resolve({ id: "session-1" }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrowError("NEXT_REDIRECT:/plan/session-1/results");
  });

  it("redirects ready sessions into the swipe route", async () => {
    mockGetSession.mockResolvedValue({
      id: "session-1",
      status: "ready_to_swipe",
      creatorDisplayName: "Alex",
      createdAt: new Date("2026-04-02T18:30:00Z"),
      expiresAt: new Date("2026-04-06T18:30:00Z"),
      matchedVenueId: null,
    });

    await expect(
      PlanPage({
        params: Promise.resolve({ id: "session-1" }),
        searchParams: Promise.resolve({ demo: "1" }),
      }),
    ).rejects.toThrowError("NEXT_REDIRECT:/plan/session-1/swipe?demo=1");
  });

  it("keeps ready sessions on the plan page when this browser has no bound role", async () => {
    mockCookies.mockResolvedValue({
      get: () => undefined,
    });
    mockGetSession.mockResolvedValue({
      id: "session-1",
      status: "ready_to_swipe",
      creatorDisplayName: "Alex",
      createdAt: new Date("2026-04-02T18:30:00Z"),
      expiresAt: new Date("2026-04-06T18:30:00Z"),
      matchedVenueId: null,
    });

    await expect(
      PlanPage({
        params: Promise.resolve({ id: "session-1" }),
        searchParams: Promise.resolve({ demo: "1" }),
      }),
    ).resolves.toBeTruthy();
  });
});

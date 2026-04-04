import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildSessionRoleCookieValue } from "../../../../../lib/session-role-access";

const mockGetSession = vi.fn();
const mockNotFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
const mockRedirect = vi.fn((href: string) => {
  throw new Error(`NEXT_REDIRECT:${href}`);
});
const mockCookies = vi.fn();
vi.mock("../../../../../lib/services/session-service", () => ({
  getSession: (...args: unknown[]) => mockGetSession(...args),
}));

vi.mock("next/navigation", () => ({
  notFound: () => mockNotFound(),
  redirect: (href: string) => mockRedirect(href),
}));

vi.mock("next/headers", () => ({
  cookies: () => mockCookies(),
}));

import SwipePage from "../page";

describe("/plan/[id]/swipe page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({
      id: "session-1",
      status: "ready_to_swipe",
      creatorDisplayName: "Alex",
      createdAt: new Date("2026-04-02T18:30:00Z"),
      expiresAt: new Date("2026-04-04T18:30:00Z"),
      matchedVenueId: null,
    });
    process.env.SESSION_ROLE_COOKIE_SECRET = "test-secret";
  });

  it("uses the bound role cookie instead of the query param", async () => {
    mockCookies.mockResolvedValue({
      get: (name: string) =>
        name === "dateflow_session_role_session-1"
          ? { value: buildSessionRoleCookieValue("session-1", "a").split(";")[0]?.split("=")[1] }
          : undefined,
    });

    const page = await SwipePage({
      params: Promise.resolve({ id: "session-1" }),
      searchParams: Promise.resolve({ role: "b", demo: "1" }),
    });

    expect(page.props).toMatchObject({
      sessionId: "session-1",
      role: "a",
      demoMode: true,
    });
  });

  it("redirects back to the plan page when this browser has no bound role", async () => {
    mockCookies.mockResolvedValue({
      get: () => undefined,
    });

    await expect(
      SwipePage({
        params: Promise.resolve({ id: "session-1" }),
        searchParams: Promise.resolve({ demo: "1" }),
      }),
    ).rejects.toThrowError("NEXT_REDIRECT:/plan/session-1?demo=1");
  });

  it("allows fallback-pending sessions to enter the swipe route with the bound role", async () => {
    mockGetSession.mockResolvedValue({
      id: "session-1",
      status: "fallback_pending",
      creatorDisplayName: "Alex",
      createdAt: new Date("2026-04-02T18:30:00Z"),
      expiresAt: new Date("2026-04-04T18:30:00Z"),
      matchedVenueId: "venue-12",
    });
    mockCookies.mockResolvedValue({
      get: (name: string) =>
        name === "dateflow_session_role_session-1"
          ? { value: buildSessionRoleCookieValue("session-1", "b").split(";")[0]?.split("=")[1] }
          : undefined,
    });

    const page = await SwipePage({
      params: Promise.resolve({ id: "session-1" }),
      searchParams: Promise.resolve({ demo: "1" }),
    });

    expect(page.props).toMatchObject({
      sessionId: "session-1",
      role: "b",
      demoMode: true,
    });
  });
});

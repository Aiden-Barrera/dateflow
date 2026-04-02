import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetSession = vi.fn();
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

import PlanPage from "../page";

describe("/plan/[id] page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects matched sessions to the result page", async () => {
    mockGetSession.mockResolvedValue({
      id: "session-1",
      status: "matched",
      creatorDisplayName: "Alex",
      createdAt: new Date("2026-04-02T18:30:00Z"),
      expiresAt: new Date("2026-04-04T18:30:00Z"),
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
      expiresAt: new Date("2026-04-04T18:30:00Z"),
      matchedVenueId: null,
    });

    await expect(
      PlanPage({
        params: Promise.resolve({ id: "session-1" }),
        searchParams: Promise.resolve({ demo: "1" }),
      }),
    ).rejects.toThrowError("NEXT_REDIRECT:/plan/session-1/swipe?role=b&demo=1");
  });
});

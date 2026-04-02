import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetMatchResult = vi.fn();
const mockGetSession = vi.fn();
const mockNotFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});

vi.mock("../../../../../../lib/services/result-service", () => ({
  getMatchResult: (...args: unknown[]) => mockGetMatchResult(...args),
}));

vi.mock("../../../../../../lib/services/session-service", () => ({
  getSession: (...args: unknown[]) => mockGetSession(...args),
}));

vi.mock("next/navigation", () => ({
  notFound: () => mockNotFound(),
}));

import ResultPage, { generateMetadata } from "../page";

describe("/plan/[id]/results page", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetSession.mockResolvedValue({
      id: "session-1",
      status: "matched",
      creatorDisplayName: "Alex",
      createdAt: new Date("2026-04-02T18:30:00Z"),
      expiresAt: new Date("2026-04-04T18:30:00Z"),
      matchedVenueId: "venue-12",
    });

    mockGetMatchResult.mockResolvedValue({
      sessionId: "session-1",
      matchedAt: new Date("2026-04-02T18:30:00Z"),
      venue: {
        id: "venue-12",
        sessionId: "session-1",
        placeId: "place-12",
        name: "Cafe Blue",
        category: "RESTAURANT",
        address: "12 Main St, Austin, TX",
        lat: 30.26,
        lng: -97.74,
        priceLevel: 2,
        rating: 4.6,
        photoUrl: "https://example.com/cafe-blue.jpg",
        tags: ["cozy patio", "walkable"],
        round: 1,
        position: 1,
        score: {
          categoryOverlap: 0.9,
          distanceToMidpoint: 0.8,
          firstDateSuitability: 0.95,
          qualitySignal: 0.85,
          timeOfDayFit: 0.75,
          composite: 0.875,
        },
      },
    });
  });

  it("renders the matched venue reveal with the primary actions", async () => {
    const page = await ResultPage({
      params: Promise.resolve({ id: "session-1" }),
    });

    const html = renderToStaticMarkup(page);

    expect(mockGetSession).toHaveBeenCalledWith("session-1");
    expect(mockGetMatchResult).toHaveBeenCalledWith("session-1");
    expect(html).toContain("It’s a match");
    expect(html).toContain("Cafe Blue");
    expect(html).toContain("You and Alex both liked this spot");
    expect(html).toContain("12 Main St, Austin, TX");
    expect(html).toContain("Get directions");
    expect(html).toContain("Add to calendar");
  });

  it("builds result-page metadata from the matched venue", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ id: "session-1" }),
    });

    expect(metadata.title).toBe("Alex matched on Cafe Blue");
    expect(metadata.description).toContain("Get directions");
    expect(metadata.openGraph?.images).toEqual([
      {
        url: "https://example.com/cafe-blue.jpg",
        alt: "Cafe Blue",
      },
    ]);
  });
});

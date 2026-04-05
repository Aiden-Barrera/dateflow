import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ResultScreen } from "../result-screen";

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const { alt, src } = props;
    return `<img alt="${String(alt ?? "")}" src="${String(src ?? "")}" />`;
  },
}));

describe("ResultScreen", () => {
  it("renders a multi-photo filmstrip when the matched venue has more than one image", () => {
    const html = renderToStaticMarkup(
      <ResultScreen
        creatorName="Alex"
        matchResult={{
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
            photoUrls: [
              "https://example.com/cafe-blue.jpg",
              "https://example.com/cafe-blue-2.jpg",
              "https://example.com/cafe-blue-3.jpg",
            ],
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
        }}
      />,
    );

    expect(html).toContain("Photo gallery");
    expect(html).toContain("3 photos");
  });
});

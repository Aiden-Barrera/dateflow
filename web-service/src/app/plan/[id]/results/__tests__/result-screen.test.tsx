import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ResultScreen, buildGoogleMapsEmbedUrl } from "../result-screen";

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const { alt, src } = props;
    return `<img alt="${String(alt ?? "")}" src="${String(src ?? "")}" />`;
  },
}));

vi.mock("../../../../../../components/auth-sheet", () => ({
  AuthSheet: ({
    open,
    errorMessage,
    submitting,
  }: {
    open: boolean;
    errorMessage: string | null;
    submitting: boolean;
  }) =>
    open
      ? `<div data-auth-sheet="true" data-error="${String(errorMessage ?? "")}" data-submitting="${String(submitting)}"></div>`
      : null,
}));

describe("ResultScreen", () => {
  it("builds a directions embed URL when an embed key is available", () => {
    const url = buildGoogleMapsEmbedUrl(
      {
        name: "Cafe Blue",
        address: "12 Main St, Austin, TX",
        lat: 30.26,
        lng: -97.74,
      },
      "embed-key",
    );

    expect(url).toContain("https://www.google.com/maps/embed/v1/place");
    expect(url).toContain("key=embed-key");
    expect(url).toContain("center=30.26%2C-97.74");
    expect(url).toContain("q=Cafe+Blue+12+Main+St%2C+Austin%2C+TX");
  });

  it("returns null when no embed key is configured", () => {
    expect(
      buildGoogleMapsEmbedUrl(
        {
          name: "Cafe Blue",
          address: "12 Main St, Austin, TX",
          lat: 30.26,
          lng: -97.74,
        },
        "",
      ),
    ).toBeNull();
  });

  it("renders a multi-photo filmstrip when the matched venue has more than one image", () => {
    const html = renderToStaticMarkup(
      <ResultScreen
        matchedWithName="Alex"
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
      sourceType: "places" as const,
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

  it("falls back to neutral shared-like copy when the counterpart name is unknown", () => {
    const html = renderToStaticMarkup(
      <ResultScreen
        matchedWithName={null}
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
            photoUrls: [],
            photoUrl: null,
      sourceType: "places" as const,
            tags: ["cozy patio"],
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

    expect(html).toContain("You both liked this spot.");
  });

  it("renders a save-this-date prompt with auth entry points", () => {
    const html = renderToStaticMarkup(
      <ResultScreen
        matchedWithName="Alex"
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
            photoUrls: [],
            photoUrl: null,
      sourceType: "places" as const,
            tags: ["cozy patio"],
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

    expect(html).toContain("Save this date");
    expect(html).toContain("Create account");
    expect(html).toContain("Log in");
    expect(html).toContain("Continue without account");
  });

  it("renders a saved-state message when the match has been linked to an account", () => {
    const html = renderToStaticMarkup(
      <ResultScreen
        matchedWithName="Alex"
        initialAuthStatus="saved"
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
            photoUrls: [],
            photoUrl: null,
      sourceType: "places" as const,
            tags: ["cozy patio"],
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

    expect(html).toContain("Saved to your history");
    expect(html).not.toContain("Create account");
  });

  it("suppresses the save prompt when a signed-in account already exists", () => {
    const html = renderToStaticMarkup(
      <ResultScreen
        matchedWithName="Alex"
        initialAccountEmail="alex@example.com"
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
            photoUrls: [],
            photoUrl: null,
      sourceType: "places" as const,
            tags: ["cozy patio"],
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

    expect(html).toContain("Signed in as alex@example.com");
    expect(html).not.toContain("Save this date");
  });
});

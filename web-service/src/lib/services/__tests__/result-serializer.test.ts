import { describe, expect, it } from "vitest";
import { serializeMatchResult } from "../result-serializer";

describe("result-serializer", () => {
  it("converts matchedAt into an ISO string for the API response", () => {
    const result = serializeMatchResult({
      sessionId: "session-1",
      matchedAt: new Date("2026-04-02T18:30:00Z"),
      venue: {
        id: "venue-12",
        sessionId: "session-1",
        placeId: "place-12",
        name: "Cafe Blue",
        category: "RESTAURANT",
        address: "12 Main St",
        lat: 30.26,
        lng: -97.74,
        priceLevel: 2,
        rating: 4.6,
        photoUrls: [
          "https://example.com/photo.jpg",
          "https://example.com/photo-2.jpg",
        ],
        photoUrl: "https://example.com/photo.jpg",
        tags: ["cozy", "patio"],
        round: 3,
        position: 4,
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

    expect(result.matchedAt).toBe("2026-04-02T18:30:00.000Z");
    expect(result.venue.name).toBe("Cafe Blue");
    expect(result.venue.photoUrls).toEqual([
      "https://example.com/photo.jpg",
      "https://example.com/photo-2.jpg",
    ]);
  });
});

import { describe, expect, it } from "vitest";
import {
  detectPlatform,
  generateDirectionsUrl,
} from "../directions-service";
import type { Venue } from "../../types/venue";

const venue: Venue = {
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
};

describe("directions-service", () => {
  it("detects ios user agents", () => {
    const platform = detectPlatform(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)"
    );

    expect(platform).toBe("ios");
  });

  it("detects android user agents", () => {
    const platform = detectPlatform(
      "Mozilla/5.0 (Linux; Android 14; Pixel 8)"
    );

    expect(platform).toBe("android");
  });

  it("detects ipad os desktop-style user agents as ios", () => {
    const platform = detectPlatform(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
    );

    expect(platform).toBe("ios");
  });

  it("defaults to desktop for non-mobile user agents", () => {
    const platform = detectPlatform(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"
    );

    expect(platform).toBe("desktop");
  });

  it("generates an Apple Maps URL for ios", () => {
    const url = generateDirectionsUrl(venue, "ios");

    expect(url).toBe(
      "https://maps.apple.com/?daddr=30.26,-97.74"
    );
  });

  it("generates a Google Maps URL for android and desktop", () => {
    expect(generateDirectionsUrl(venue, "android")).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=30.26,-97.74"
    );
    expect(generateDirectionsUrl(venue, "desktop")).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=30.26,-97.74"
    );
  });
});

import { describe, it, expect } from "vitest";
import {
  calculateMidpoint,
  distanceBetween,
} from "../midpoint-calculator";
import type { Location } from "../../types/preference";

describe("midpoint-calculator", () => {
  // ------------------------------------------------------------------
  // calculateMidpoint
  // ------------------------------------------------------------------

  describe("calculateMidpoint", () => {
    it("calculates midpoint between two Austin locations", () => {
      // Person A: downtown Austin (30.2672, -97.7431)
      // Person B: south Austin / Barton Springs area (30.2641, -97.7708)
      const locationA: Location = { lat: 30.2672, lng: -97.7431, label: "Downtown Austin" };
      const locationB: Location = { lat: 30.2641, lng: -97.7708, label: "South Austin" };

      const midpoint = calculateMidpoint(locationA, locationB);

      // Midpoint should be roughly between the two (~30.2656, ~-97.757)
      expect(midpoint.lat).toBeCloseTo(30.2656, 3);
      expect(midpoint.lng).toBeCloseTo(-97.757, 2);
      expect(midpoint.label).toBe("Midpoint");
    });

    it("returns the same location when both inputs are identical", () => {
      const location: Location = { lat: 30.2672, lng: -97.7431, label: "Same Spot" };

      const midpoint = calculateMidpoint(location, location);

      expect(midpoint.lat).toBeCloseTo(30.2672, 4);
      expect(midpoint.lng).toBeCloseTo(-97.7431, 4);
    });
  });

  // ------------------------------------------------------------------
  // distanceBetween
  // ------------------------------------------------------------------

  describe("distanceBetween", () => {
    it("returns correct distance for a known pair", () => {
      // Downtown Austin to Austin-Bergstrom Airport is ~11.3 km
      const downtown: Location = { lat: 30.2672, lng: -97.7431, label: "Downtown" };
      const airport: Location = { lat: 30.1975, lng: -97.6664, label: "Airport" };

      const meters = distanceBetween(downtown, airport);

      // Should be roughly 10,500–12,000 meters
      expect(meters).toBeGreaterThan(10_000);
      expect(meters).toBeLessThan(12_000);
    });

    it("returns zero when both points are the same", () => {
      const point: Location = { lat: 30.2672, lng: -97.7431, label: "Here" };

      const meters = distanceBetween(point, point);

      expect(meters).toBe(0);
    });
  });
});

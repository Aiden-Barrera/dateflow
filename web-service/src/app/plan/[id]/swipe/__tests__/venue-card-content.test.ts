import { describe, it, expect } from "vitest";
import {
  formatRatingWithCount,
  formatDistance,
} from "../venue-card-content";

describe("formatRatingWithCount", () => {
  it("formats with no review count", () => {
    expect(formatRatingWithCount(4.5, undefined)).toBe("4.5 rating");
    expect(formatRatingWithCount(4.5, 0)).toBe("4.5 rating");
  });

  it("formats singular review", () => {
    expect(formatRatingWithCount(4.2, 1)).toBe("4.2 · 1 review");
  });

  it("formats plural reviews", () => {
    expect(formatRatingWithCount(4.8, 250)).toBe("4.8 · 250 reviews");
  });

  it("abbreviates thousands", () => {
    expect(formatRatingWithCount(4.7, 1000)).toBe("4.7 · 1k reviews");
    expect(formatRatingWithCount(4.7, 12500)).toBe("4.7 · 13k reviews");
    expect(formatRatingWithCount(4.7, 1500)).toBe("4.7 · 1.5k reviews");
  });
});

describe("formatDistance", () => {
  it("formats sub-0.1 mile as threshold label", () => {
    expect(formatDistance(50)).toBe("<0.1 mi away");
  });

  it("formats 1 mile correctly", () => {
    expect(formatDistance(1609)).toMatch(/^1\.0 mi away$/);
  });

  it("formats larger distances", () => {
    expect(formatDistance(8047)).toMatch(/5\.0 mi away/);
  });
});

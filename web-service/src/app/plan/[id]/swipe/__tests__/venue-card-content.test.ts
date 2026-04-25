import { describe, it, expect } from "vitest";
import {
  formatRatingWithCount,
  formatDistance,
  getAgeRestrictionLabel,
  buildSwipeCardAriaLabel,
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

describe("getAgeRestrictionLabel", () => {
  it("returns null when ageRestriction is undefined", () => {
    expect(getAgeRestrictionLabel(undefined)).toBeNull();
  });

  it("returns null when ageRestriction is null", () => {
    expect(getAgeRestrictionLabel(null)).toBeNull();
  });

  it('returns "18+" for 18+ restriction', () => {
    expect(getAgeRestrictionLabel("18+")).toBe("18+");
  });

  it('returns "21+" for 21+ restriction', () => {
    expect(getAgeRestrictionLabel("21+")).toBe("21+");
  });
});

describe("buildSwipeCardAriaLabel", () => {
  it("includes venue name and category", () => {
    const label = buildSwipeCardAriaLabel("The Comedy Club", "BAR", undefined);
    expect(label).toContain("The Comedy Club");
    expect(label).toContain("BAR");
  });

  it("omits age restriction when not present", () => {
    const label = buildSwipeCardAriaLabel("Cafe Luna", "RESTAURANT", undefined);
    expect(label).not.toContain("18+");
    expect(label).not.toContain("21+");
  });

  it("includes age restriction in label when present", () => {
    const label = buildSwipeCardAriaLabel("Club Noir", "BAR", "21+");
    expect(label).toContain("21+");
  });

  it("includes 18+ restriction in label when present", () => {
    const label = buildSwipeCardAriaLabel("Comedy Night", "ACTIVITY", "18+");
    expect(label).toContain("18+");
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

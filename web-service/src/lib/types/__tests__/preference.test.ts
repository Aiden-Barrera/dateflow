import { describe, it, expect } from "vitest";
import { toPreference } from "../preference";
import { serializePreference } from "../../services/preference-serializer";
import type { PreferenceRow } from "../preference";
import type { Preference } from "../preference";

const baseRow: PreferenceRow = {
  id: "pref-abc-123",
  session_id: "session-xyz-456",
  role: "a",
  location: { lat: 30.2672, lng: -97.7431, label: "Downtown Austin" },
  budget: "MODERATE",
  categories: ["RESTAURANT", "BAR"],
  created_at: "2026-03-27T12:05:00Z",
};

describe("toPreference", () => {
  it("maps snake_case row fields to camelCase Preference fields", () => {
    const pref = toPreference(baseRow);

    expect(pref.id).toBe("pref-abc-123");
    expect(pref.sessionId).toBe("session-xyz-456");
    expect(pref.role).toBe("a");
    expect(pref.budget).toBe("MODERATE");
  });

  it("converts created_at string to Date object", () => {
    const pref = toPreference(baseRow);

    expect(pref.createdAt).toBeInstanceOf(Date);
    expect(pref.createdAt.toISOString()).toBe("2026-03-27T12:05:00.000Z");
  });

  it("preserves location JSONB as Location object", () => {
    const pref = toPreference(baseRow);

    expect(pref.location.lat).toBe(30.2672);
    expect(pref.location.lng).toBe(-97.7431);
    expect(pref.location.label).toBe("Downtown Austin");
  });

  it("preserves categories array", () => {
    const pref = toPreference(baseRow);

    expect(pref.categories).toEqual(["RESTAURANT", "BAR"]);
  });
});

const testPreference: Preference = {
  id: "pref-abc-123",
  sessionId: "session-xyz-456",
  role: "a",
  location: { lat: 30.2672, lng: -97.7431, label: "Downtown Austin" },
  budget: "MODERATE",
  categories: ["RESTAURANT", "BAR"],
  createdAt: new Date("2026-03-27T12:05:00Z"),
};

describe("serializePreference", () => {
  it("converts createdAt Date to ISO string", () => {
    const result = serializePreference(testPreference);

    expect(result.createdAt).toBe("2026-03-27T12:05:00.000Z");
    expect(typeof result.createdAt).toBe("string");
  });

  it("preserves all other fields", () => {
    const result = serializePreference(testPreference);

    expect(result.id).toBe("pref-abc-123");
    expect(result.sessionId).toBe("session-xyz-456");
    expect(result.role).toBe("a");
    expect(result.budget).toBe("MODERATE");
    expect(result.categories).toEqual(["RESTAURANT", "BAR"]);
    expect(result.location).toEqual({
      lat: 30.2672,
      lng: -97.7431,
      label: "Downtown Austin",
    });
  });
});

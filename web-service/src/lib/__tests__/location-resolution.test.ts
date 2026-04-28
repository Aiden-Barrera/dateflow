import { describe, expect, it, vi } from "vitest";

import { resolveSubmittedLocation } from "../location-resolution";

describe("resolveSubmittedLocation", () => {
  it("returns the existing GPS location without geocoding", async () => {
    const fetchSpy = vi.fn();

    const location = await resolveSubmittedLocation(
      { lat: 40.7128, lng: -74.006, label: "Current Location" },
      "",
      fetchSpy as typeof fetch,
    );

    expect(location).toEqual({
      lat: 40.7128,
      lng: -74.006,
      label: "Current Location",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("geocodes a manual zip or city entry into real coordinates", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        lat: 40.8495,
        lng: -74.0388,
        label: "Little Ferry, NJ 07643, USA",
      }),
    });

    const location = await resolveSubmittedLocation(
      null,
      "07643",
      fetchSpy as typeof fetch,
    );

    expect(fetchSpy).toHaveBeenCalledWith("/api/geocode?q=07643");
    expect(location).toEqual({
      lat: 40.8495,
      lng: -74.0388,
      label: "Little Ferry, NJ 07643, USA",
    });
  });

  it("throws the geocoding error instead of returning a placeholder location", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        error: "Location not found. Try a city name, neighborhood, or zip code.",
      }),
    });

    await expect(
      resolveSubmittedLocation(null, "not-a-real-place", fetchSpy as typeof fetch),
    ).rejects.toThrow(/location not found/i);
  });

  it("normalizes low-level fetch failures into a user-facing error", async () => {
    const fetchSpy = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(
      resolveSubmittedLocation(null, "07643", fetchSpy as typeof fetch),
    ).rejects.toThrow("Couldn't look up your location. Check your connection and try again.");
  });

  it("normalizes malformed geocode payload failures into a user-facing error", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => {
        throw new SyntaxError("Unexpected end of JSON input");
      },
    });

    await expect(
      resolveSubmittedLocation(null, "07643", fetchSpy as typeof fetch),
    ).rejects.toThrow("Couldn't look up your location. Check your connection and try again.");
  });
});

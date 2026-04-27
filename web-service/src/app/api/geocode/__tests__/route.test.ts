import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Stub GOOGLE_PLACES_API_KEY so the route doesn't 503 in normal tests
vi.stubEnv("GOOGLE_PLACES_API_KEY", "test-api-key");

import { GET } from "../route";

function makeGetRequest(q?: string): Request {
  const url = q !== undefined
    ? `http://localhost:3000/api/geocode?q=${encodeURIComponent(q)}`
    : "http://localhost:3000/api/geocode";
  return new Request(url, { method: "GET" });
}

function makePlacesResponse(places: object[]): Response {
  return {
    ok: true,
    json: async () => ({ places }),
    text: async () => JSON.stringify({ places }),
  } as unknown as Response;
}

describe("GET /api/geocode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when q is missing", async () => {
    const response = await GET(makeGetRequest());
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/missing/i);
  });

  it("returns 400 when q is empty after trim", async () => {
    const response = await GET(makeGetRequest("   "));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/missing/i);
  });

  it("returns 400 when q exceeds 200 characters", async () => {
    const response = await GET(makeGetRequest("a".repeat(201)));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/too long/i);
  });

  it("returns 502 when the Places API responds with a non-OK status", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: async () => "API key invalid",
    });

    const response = await GET(makeGetRequest("07643"));
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.error).toMatch(/geocoding failed/i);
  });

  it("returns 422 when the Places API returns no results", async () => {
    mockFetch.mockResolvedValueOnce(makePlacesResponse([]));

    const response = await GET(makeGetRequest("zzzznotaplace"));
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error).toMatch(/not found/i);
  });

  it("returns 200 with lat/lng/label on a successful geocode", async () => {
    mockFetch.mockResolvedValueOnce(
      makePlacesResponse([
        {
          displayName: { text: "Little Ferry, NJ, USA" },
          formattedAddress: "Little Ferry, NJ 07643, USA",
          location: { latitude: 40.8495, longitude: -74.0388 },
        },
      ]),
    );

    const response = await GET(makeGetRequest("07643"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      lat: 40.8495,
      lng: -74.0388,
      label: "Little Ferry, NJ 07643, USA",
    });
  });

  it("falls back to displayName when formattedAddress is absent", async () => {
    mockFetch.mockResolvedValueOnce(
      makePlacesResponse([
        {
          displayName: { text: "Brooklyn" },
          location: { latitude: 40.6782, longitude: -73.9442 },
        },
      ]),
    );

    const response = await GET(makeGetRequest("Brooklyn"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.label).toBe("Brooklyn");
  });

  it("returns 502 when a place is returned but has no location", async () => {
    mockFetch.mockResolvedValueOnce(
      makePlacesResponse([
        {
          displayName: { text: "Mystery Place" },
          formattedAddress: "Unknown",
        },
      ]),
    );

    const response = await GET(makeGetRequest("mystery"));
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.error).toMatch(/geocoding failed/i);
  });

  it("returns 500 when fetch throws unexpectedly", async () => {
    mockFetch.mockRejectedValueOnce(new Error("network error"));

    const response = await GET(makeGetRequest("07643"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toMatch(/geocoding failed/i);
  });
});

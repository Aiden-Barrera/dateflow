import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "../route";

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubEnv("GOOGLE_PLACES_API_KEY", "test-api-key");
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function makeRequest(q?: string): Request {
  const url = q !== undefined
    ? `http://localhost:3000/api/geocode?q=${encodeURIComponent(q)}`
    : "http://localhost:3000/api/geocode";
  return new Request(url, { method: "GET" });
}

const successBody = {
  places: [
    {
      displayName: { text: "Little Ferry" },
      formattedAddress: "Little Ferry, NJ 07643, USA",
      location: { latitude: 40.8501, longitude: -74.0399 },
    },
  ],
};

describe("GET /api/geocode", () => {
  it("returns lat/lng/label for a valid zip code", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(successBody), { status: 200 })
    );

    const response = await GET(makeRequest("07643"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      lat: 40.8501,
      lng: -74.0399,
      label: "Little Ferry, NJ 07643, USA",
    });
    expect(mockFetch).toHaveBeenCalledWith(
      "https://places.googleapis.com/v1/places:searchText",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ textQuery: "07643" }),
      })
    );
  });

  it("returns 400 when q is missing", async () => {
    const response = await GET(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/missing/i);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns 400 when q is empty after trimming", async () => {
    const response = await GET(makeRequest("   "));
    await response.json();

    expect(response.status).toBe(400);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns 400 when q exceeds 200 characters", async () => {
    const response = await GET(makeRequest("a".repeat(201)));
    await response.json();

    expect(response.status).toBe(400);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns 422 when Places API returns no results", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ places: [] }), { status: 200 })
    );

    const response = await GET(makeRequest("xyznonexistent99999"));
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error).toBe("Location not found");
  });

  it("returns 422 when Places API returns empty body (no places key)", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({}), { status: 200 })
    );

    const response = await GET(makeRequest("07643"));
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error).toBe("Location not found");
  });

  it("returns 502 when Places API returns a non-OK status", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response("API error", { status: 400 })
    );

    const response = await GET(makeRequest("07643"));
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.error).toBe("Geocoding service error");
  });

  it("returns 502 when Places API place is missing coordinates", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          places: [{ displayName: { text: "Somewhere" } }],
        }),
        { status: 200 }
      )
    );

    const response = await GET(makeRequest("07643"));
    await response.json();

    expect(response.status).toBe(502);
  });

  it("falls back to displayName when formattedAddress is absent", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          places: [
            {
              displayName: { text: "Little Ferry, NJ" },
              location: { latitude: 40.8501, longitude: -74.0399 },
            },
          ],
        }),
        { status: 200 }
      )
    );

    const response = await GET(makeRequest("07643"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.label).toBe("Little Ferry, NJ");
  });

  it("returns 500 when fetch throws", async () => {
    mockFetch.mockRejectedValueOnce(new Error("network failure"));

    const response = await GET(makeRequest("07643"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Geocoding service error");
  });
});

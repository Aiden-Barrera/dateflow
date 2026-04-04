import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "../route";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("GET /api/places/photos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("GOOGLE_PLACES_API_KEY", "test-api-key");
  });

  it("proxies a Google Places photo without exposing the API key in the returned url", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response("image-bytes", {
        status: 200,
        headers: {
          "content-type": "image/jpeg",
        },
      }),
    );

    const response = await GET(
      new Request(
        "http://localhost:3000/api/places/photos?name=places%2Fabc123%2Fphotos%2Fref123&maxHeightPx=900",
      ),
    );

    expect(mockFetch).toHaveBeenCalledWith(
      "https://places.googleapis.com/v1/places/abc123/photos/ref123/media?maxHeightPx=900",
      {
        headers: {
          "X-Goog-Api-Key": "test-api-key",
        },
      },
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/jpeg");
    expect(response.headers.get("cache-control")).toContain("max-age=86400");
    await expect(response.text()).resolves.toBe("image-bytes");
  });

  it("returns 400 when the photo name is missing or malformed", async () => {
    const missingName = await GET(
      new Request("http://localhost:3000/api/places/photos"),
    );
    const badName = await GET(
      new Request(
        "http://localhost:3000/api/places/photos?name=https://evil.test/image.jpg",
      ),
    );

    expect(missingName.status).toBe(400);
    expect(badName.status).toBe(400);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns 503 when Google Places photo proxy is not configured", async () => {
    vi.stubEnv("GOOGLE_PLACES_API_KEY", "");

    const response = await GET(
      new Request(
        "http://localhost:3000/api/places/photos?name=places%2Fabc123%2Fphotos%2Fref123",
      ),
    );

    expect(response.status).toBe(503);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

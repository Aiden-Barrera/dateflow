import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "../route";

const mockFetch = vi.fn();
const mockRecordPlacesPhotoUsage = vi.fn();
vi.stubGlobal("fetch", mockFetch);

vi.mock("../../../../../lib/services/unit-economics-service", () => ({
  recordPlacesPhotoUsage: (...args: unknown[]) => mockRecordPlacesPhotoUsage(...args),
}));

describe("GET /api/places/photos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("GOOGLE_PLACES_API_KEY", "test-api-key");
    mockRecordPlacesPhotoUsage.mockResolvedValue(undefined);
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

  it("records photo usage when the request referer includes a session id", async () => {
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
        "http://localhost:3000/api/places/photos?name=places%2Fabc123%2Fphotos%2Fref123",
        {
          headers: {
            referer: "http://localhost:3000/plan/123e4567-e89b-42d3-a456-426614174000/swipe",
          },
        },
      ),
    );

    expect(response.status).toBe(200);
    expect(mockRecordPlacesPhotoUsage).toHaveBeenCalledWith(
      "123e4567-e89b-42d3-a456-426614174000",
      1,
    );
  });

  it("ignores malformed session ids instead of recording photo usage", async () => {
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
        "http://localhost:3000/api/places/photos?name=places%2Fabc123%2Fphotos%2Fref123&sessionId=not-a-uuid",
      ),
    );

    expect(response.status).toBe(200);
    expect(mockRecordPlacesPhotoUsage).not.toHaveBeenCalled();
  });
});

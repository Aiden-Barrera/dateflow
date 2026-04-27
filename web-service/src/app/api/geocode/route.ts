import { NextResponse } from "next/server";

const PLACES_TEXT_SEARCH_URL =
  "https://places.googleapis.com/v1/places:searchText";

type PlacesTextSearchResponse = {
  readonly places?: ReadonlyArray<{
    readonly displayName?: { readonly text?: string };
    readonly formattedAddress?: string;
    readonly location?: { readonly latitude?: number; readonly longitude?: number };
  }>;
};

/**
 * GET /api/geocode?q=<query>
 *
 * Resolves a free-text location query (zip code, city, neighborhood) to a
 * lat/lng coordinate using the Google Places Text Search API.
 *
 * Returns { lat, lng, label } on success, or an appropriate error response.
 *
 * Rate-limited by the caller (one request per user input submission).
 * GOOGLE_PLACES_API_KEY must be set — the same key used for venue search.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";

  if (!q) {
    return NextResponse.json(
      { error: "Missing required query parameter: q" },
      { status: 400 }
    );
  }

  if (q.length > 200) {
    return NextResponse.json(
      { error: "Query too long (max 200 characters)" },
      { status: 400 }
    );
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.error("[GET /api/geocode] GOOGLE_PLACES_API_KEY not set");
    return NextResponse.json(
      { error: "Geocoding service unavailable" },
      { status: 503 }
    );
  }

  try {
    const response = await fetch(PLACES_TEXT_SEARCH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.location",
      },
      body: JSON.stringify({ textQuery: q }),
    });

    if (!response.ok) {
      console.error("[GET /api/geocode] Places API error", {
        status: response.status,
        q,
      });
      return NextResponse.json(
        { error: "Geocoding service error" },
        { status: 502 }
      );
    }

    const data = (await response.json()) as PlacesTextSearchResponse;
    const place = data.places?.[0];

    if (!place) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 422 }
      );
    }

    const lat = place.location?.latitude;
    const lng = place.location?.longitude;

    if (typeof lat !== "number" || typeof lng !== "number") {
      console.error("[GET /api/geocode] Places API returned place without coordinates", { q });
      return NextResponse.json(
        { error: "Geocoding service error" },
        { status: 502 }
      );
    }

    const label =
      place.formattedAddress ??
      place.displayName?.text ??
      q;

    return NextResponse.json({ lat, lng, label });
  } catch (err) {
    console.error("[GET /api/geocode] Unexpected error", err);
    return NextResponse.json(
      { error: "Geocoding service error" },
      { status: 500 }
    );
  }
}

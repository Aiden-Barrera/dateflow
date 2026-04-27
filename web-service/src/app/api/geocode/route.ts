import { NextResponse } from "next/server";

/**
 * GET /api/geocode?q=<address>
 *
 * Server-side geocoding using the Google Places API (New) Text Search endpoint.
 * This reuses the existing GOOGLE_PLACES_API_KEY — no additional API product
 * needs to be enabled. Resolves city names, neighborhoods, and zip codes into
 * real lat/lng coordinates.
 *
 * Returns { lat, lng, label } on success or { error } on failure.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";

  if (query.length === 0) {
    return NextResponse.json({ error: "Missing query parameter q" }, { status: 400 });
  }

  if (query.length > 200) {
    return NextResponse.json({ error: "Query too long" }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.error("[GET /api/geocode] GOOGLE_PLACES_API_KEY is not set");
    return NextResponse.json({ error: "Geocoding unavailable" }, { status: 503 });
  }

  try {
    // Places API (New) Text Search — returns the top matching place with
    // its geometry. The field mask limits the response to only what we need,
    // keeping the request cheap.
    const response = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          // Request only the fields we need — minimises billing footprint.
          "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.location",
        },
        body: JSON.stringify({ textQuery: query }),
      },
    );

    if (!response.ok) {
      const body = await response.text();
      console.error(`[GET /api/geocode] Places API error ${response.status}`, body);
      return NextResponse.json({ error: "Geocoding failed" }, { status: 502 });
    }

    type PlacesResult = {
      places?: Array<{
        displayName?: { text: string };
        formattedAddress?: string;
        location?: { latitude: number; longitude: number };
      }>;
    };

    const data = (await response.json()) as PlacesResult;

    if (!data.places || data.places.length === 0) {
      console.warn("[GET /api/geocode] No results", { query });
      return NextResponse.json(
        { error: "Location not found. Try a city name, neighborhood, or zip code." },
        { status: 422 },
      );
    }

    const place = data.places[0];
    const lat = place.location?.latitude;
    const lng = place.location?.longitude;

    if (lat === undefined || lng === undefined) {
      console.error("[GET /api/geocode] Place missing location", { query, place });
      return NextResponse.json({ error: "Geocoding failed" }, { status: 502 });
    }

    const label =
      place.formattedAddress ??
      place.displayName?.text ??
      query;

    return NextResponse.json({ lat, lng, label });
  } catch (err) {
    console.error("[GET /api/geocode] Unexpected error:", err);
    return NextResponse.json({ error: "Geocoding failed" }, { status: 500 });
  }
}

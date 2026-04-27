import { NextResponse } from "next/server";

/**
 * GET /api/geocode?q=<address>
 *
 * Server-side proxy for the Google Geocoding API. Keeps GOOGLE_PLACES_API_KEY
 * off the client while letting both location screens resolve a city name or
 * zip code into real lat/lng coordinates.
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
    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.searchParams.set("address", query);
    url.searchParams.set("key", apiKey);

    const response = await fetch(url.toString());
    if (!response.ok) {
      console.error(`[GET /api/geocode] Google API HTTP error ${response.status}`);
      return NextResponse.json({ error: "Geocoding failed" }, { status: 502 });
    }

    type GeocodeResult = {
      geometry: { location: { lat: number; lng: number } };
      formatted_address: string;
    };
    type GeocodeResponse = {
      status: string;
      results: GeocodeResult[];
      error_message?: string;
    };

    const data = (await response.json()) as GeocodeResponse;

    if (data.status !== "OK" || data.results.length === 0) {
      console.warn("[GET /api/geocode] No results", { query, status: data.status });
      return NextResponse.json(
        { error: "Location not found. Try a more specific city name or zip code." },
        { status: 422 },
      );
    }

    const { lat, lng } = data.results[0].geometry.location;
    const label = data.results[0].formatted_address;

    return NextResponse.json({ lat, lng, label });
  } catch (err) {
    console.error("[GET /api/geocode] Unexpected error:", err);
    return NextResponse.json({ error: "Geocoding failed" }, { status: 500 });
  }
}

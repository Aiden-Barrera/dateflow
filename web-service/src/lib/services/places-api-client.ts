import type { Location, Category } from "../types/preference";
import type { PlaceCandidate } from "../types/venue";

/**
 * Google Places API (New) Nearby Search endpoint.
 * Uses the v1 REST API with field masks to minimize cost.
 */
const PLACES_API_URL = "https://places.googleapis.com/v1/places:searchNearby";

/**
 * The fields we request from Google. Each field has a billing cost tier —
 * we only request what we actually need for PlaceCandidate.
 */
const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.types",
  "places.priceLevel",
  "places.rating",
  "places.userRatingCount",
  "places.photos",
].join(",");

// ---------------------------------------------------------------------------
// Google price level string → numeric mapping
// ---------------------------------------------------------------------------

const PRICE_LEVEL_MAP: Record<string, number> = {
  PRICE_LEVEL_FREE: 0,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

/**
 * Converts a Google price level string (e.g. "PRICE_LEVEL_MODERATE") to a
 * numeric value (0–4). Returns 0 if the field is missing or unrecognized.
 */
function parsePriceLevel(priceLevel: string | undefined): number {
  if (!priceLevel) return 0;
  return PRICE_LEVEL_MAP[priceLevel] ?? 0;
}

// ---------------------------------------------------------------------------
// Google type → our Category mapping
// ---------------------------------------------------------------------------

/**
 * Maps from Google Places type strings to our Category enum.
 * Google returns multiple types per place — we pick the first match
 * in priority order: RESTAURANT > BAR > EVENT > ACTIVITY.
 */
const TYPE_TO_CATEGORY: Record<string, Category> = {
  // RESTAURANT
  restaurant: "RESTAURANT",
  cafe: "RESTAURANT",
  bakery: "RESTAURANT",
  meal_delivery: "RESTAURANT",
  meal_takeaway: "RESTAURANT",
  food: "RESTAURANT",
  // BAR
  bar: "BAR",
  night_club: "BAR",
  liquor_store: "BAR",
  // EVENT
  movie_theater: "EVENT",
  performing_arts_theater: "EVENT",
  stadium: "EVENT",
  // ACTIVITY
  bowling_alley: "ACTIVITY",
  amusement_park: "ACTIVITY",
  aquarium: "ACTIVITY",
  art_gallery: "ACTIVITY",
  museum: "ACTIVITY",
  park: "ACTIVITY",
  spa: "ACTIVITY",
  tourist_attraction: "ACTIVITY",
  zoo: "ACTIVITY",
};

/**
 * Given a Google Places types array, returns the best-matching Category.
 * Falls back to ACTIVITY for unrecognized types.
 */
export function mapGoogleTypeToCategory(types: readonly string[]): Category {
  for (const type of types) {
    const category = TYPE_TO_CATEGORY[type];
    if (category) return category;
  }
  return "ACTIVITY";
}

// ---------------------------------------------------------------------------
// Response types (Google Places API v1 shape)
// ---------------------------------------------------------------------------

type GooglePlace = {
  readonly id: string;
  readonly displayName: { readonly text: string };
  readonly formattedAddress: string;
  readonly location: { readonly latitude: number; readonly longitude: number };
  readonly types: readonly string[];
  readonly priceLevel?: string;
  readonly rating?: number;
  readonly userRatingCount?: number;
  readonly photos?: readonly { readonly name: string }[];
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetches nearby venue candidates from Google Places Nearby Search (New) API.
 *
 * @param location  Center point for the search (typically the midpoint)
 * @param radius    Search radius in meters (e.g., 2000 for 2 km)
 * @param types     Google Places type strings to include (e.g., ["restaurant", "bar"])
 * @param maxPrice  Maximum price level (1–4). Google uses 0–4, so we allow up to 4.
 * @returns         Array of PlaceCandidate objects, or empty array if no results
 *
 * @throws          If the API returns a non-OK HTTP status
 */
export async function searchNearby(
  location: Location,
  radius: number,
  types: readonly string[],
  maxPrice: number
): Promise<readonly PlaceCandidate[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_PLACES_API_KEY environment variable is not set");
  }

  const body = {
    includedTypes: types,
    maxResultCount: 20,
    locationRestriction: {
      circle: {
        center: { latitude: location.lat, longitude: location.lng },
        radius,
      },
    },
    ...(maxPrice > 0 && {
      includedPrimaryTypes: types,
      maxPriceLevel: maxPrice,
    }),
  };

  const response = await fetch(PLACES_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const statusText = response.statusText;
    throw new Error(`Google Places API error: ${response.status} ${statusText}`);
  }

  const data = await response.json();
  const places: readonly GooglePlace[] = data.places ?? [];

  return places.map((place) => ({
    placeId: place.id,
    name: place.displayName.text,
    address: place.formattedAddress,
    location: {
      lat: place.location.latitude,
      lng: place.location.longitude,
      label: place.displayName.text,
    },
    types: place.types,
    priceLevel: parsePriceLevel(place.priceLevel),
    rating: place.rating ?? 0,
    reviewCount: place.userRatingCount ?? 0,
    photoReference: place.photos?.[0]?.name ?? null,
  }));
}

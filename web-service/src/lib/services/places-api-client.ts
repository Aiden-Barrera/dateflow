import type { Location, Category } from "../types/preference";
import type { PlaceCandidate } from "../types/venue";

/**
 * Google Places API (New) Nearby Search endpoint.
 * Uses the v1 REST API with field masks to minimize cost.
 */
const PLACES_API_URL = "https://places.googleapis.com/v1/places:searchNearby";
const PLACES_PHOTO_ROUTE = "/api/places/photos";
const DEFAULT_PHOTO_MAX_HEIGHT_PX = 1200;

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
  "places.primaryType",
  "places.priceLevel",
  "places.rating",
  "places.userRatingCount",
  "places.photos",
  "places.editorialSummary",
  "places.regularOpeningHours",
  "places.currentOpeningHours",
  "places.websiteUri",
].join(",");

export function getGooglePlacesReadiness(): {
  readonly ready: boolean;
  readonly missing: readonly string[];
} {
  const missing = process.env.GOOGLE_PLACES_API_KEY
    ? []
    : ["GOOGLE_PLACES_API_KEY"];

  return {
    ready: missing.length === 0,
    missing,
  };
}

export function buildGooglePlacePhotoUrl(
  photoReference: string | null,
  sessionId?: string,
): string | null {
  if (!photoReference) {
    return null;
  }

  const photoPath = photoReference.startsWith("places/")
    ? photoReference
    : `places/${photoReference}`;
  const photoQuery =
    `name=${encodeURIComponent(photoPath)}&maxHeightPx=${DEFAULT_PHOTO_MAX_HEIGHT_PX}` +
    (sessionId ? `&sessionId=${encodeURIComponent(sessionId)}` : "");
  return `${PLACES_PHOTO_ROUTE}?${photoQuery}`;
}

export function buildGooglePlacePhotoUrls(
  photoReferences: readonly string[],
  sessionId?: string,
): readonly string[] {
  return photoReferences
    .map((photoReference) => buildGooglePlacePhotoUrl(photoReference, sessionId))
    .filter((photoUrl): photoUrl is string => photoUrl !== null);
}

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
  // EVENT (extended)
  concert_hall: "EVENT",
  opera_house: "EVENT",
  comedy_club: "EVENT",
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
  roller_skating_rink: "ACTIVITY",
  ice_skating_rink: "ACTIVITY",
  skating_rink: "ACTIVITY",
  escape_room: "ACTIVITY",
  arcade: "ACTIVITY",
  mini_golf_course: "ACTIVITY",
  karaoke: "ACTIVITY",
  billiard_hall: "ACTIVITY",
  go_kart_track: "ACTIVITY",
  laser_tag_center: "ACTIVITY",
  trampoline_park: "ACTIVITY",
  axe_throwing: "ACTIVITY",
};

/**
 * Category selection priority when multiple mapped categories are present
 * for a single place.
 */
const CATEGORY_PRIORITY: readonly Category[] = [
  "RESTAURANT",
  "BAR",
  "EVENT",
  "ACTIVITY",
];

const DENY_LISTED_PLACE_TYPES = new Set<string>([
  "gym",
  "liquor_store",
  "convenience_store",
  "gas_station",
  "funeral_home",
  "car_wash",
  "fast_food_restaurant",
  "chicken_restaurant",
  "hamburger_restaurant",
]);

const FAST_FOOD_PLACE_TYPES = new Set<string>([
  "fast_food_restaurant",
  "food_court",
  "hamburger_restaurant",
  "chicken_restaurant",
  "sandwich_shop",
]);

const FAST_FOOD_CHAIN_PATTERNS: readonly RegExp[] = [
  /\bmcdonald'?s\b/i,
  /\btaco bell\b/i,
  /\bkfc\b/i,
  /\bjollibee\b/i,
  /\bburger king\b/i,
  /\bwendy'?s\b/i,
  /\bchick-?fil-?a\b/i,
  /\bsubway\b/i,
  /\bdomino'?s\b/i,
  /\bpizza hut\b/i,
];

function isFastFoodChainName(name: string): boolean {
  return FAST_FOOD_CHAIN_PATTERNS.some((pattern) => pattern.test(name));
}

type FirstDateVenueLike = {
  readonly name: string;
  readonly types: readonly string[];
  readonly primaryType?: string | null;
};

function hasFastFoodType(place: FirstDateVenueLike): boolean {
  if (place.primaryType && FAST_FOOD_PLACE_TYPES.has(place.primaryType)) {
    return true;
  }

  return place.types.some((type) => FAST_FOOD_PLACE_TYPES.has(type));
}

function isGenericRestaurantLike(place: FirstDateVenueLike): boolean {
  if (place.primaryType === "restaurant") {
    return true;
  }

  return place.types.includes("restaurant") && !place.primaryType;
}

export function isDeniedFirstDateVenue(place: FirstDateVenueLike): boolean {
  if (place.primaryType && DENY_LISTED_PLACE_TYPES.has(place.primaryType)) {
    return true;
  }

  if (place.types.some((type) => DENY_LISTED_PLACE_TYPES.has(type))) {
    return true;
  }

  if (hasFastFoodType(place)) {
    return true;
  }

  if (isGenericRestaurantLike(place) && isFastFoodChainName(place.name)) {
    return true;
  }

  return false;
}

export function filterDeniedFirstDateVenues<T extends FirstDateVenueLike>(
  places: readonly T[],
): readonly T[] {
  return places.filter((place) => !isDeniedFirstDateVenue(place));
}

/**
 * Given a Google Places `primaryType` and full `types` array, returns the
 * best-matching Category. Prefers `primaryType` when it maps to a known
 * Category — this avoids misclassifying activities that also carry a
 * secondary `restaurant`/`food` tag (e.g. a roller skating rink with a
 * concession bar). Falls back to a priority scan of `types`
 * (RESTAURANT > BAR > EVENT > ACTIVITY) when `primaryType` is absent or
 * unknown. Falls back to ACTIVITY if nothing matches.
 */
export function mapGoogleTypeToCategory(
  types: readonly string[],
  primaryType?: string | null,
): Category {
  if (primaryType) {
    const primaryCategory = TYPE_TO_CATEGORY[primaryType];
    if (primaryCategory) {
      return primaryCategory;
    }
  }

  const presentCategories = new Set<Category>();

  for (const type of types) {
    const category = TYPE_TO_CATEGORY[type];
    if (category) {
      presentCategories.add(category);
    }
  }

  for (const priorityCategory of CATEGORY_PRIORITY) {
    if (presentCategories.has(priorityCategory)) {
      return priorityCategory;
    }
  }

  return "ACTIVITY";
}

/**
 * Maps a Category enum to the Google Places type strings used for search.
 * Each category maps to the primary types we want Google to return.
 */
const CATEGORY_TO_GOOGLE_TYPES: Record<Category, readonly string[]> = {
  RESTAURANT: ["restaurant", "cafe", "bakery"],
  BAR: ["bar", "night_club"],
  ACTIVITY: ["bowling_alley", "amusement_park", "aquarium", "art_gallery", "museum", "spa", "tourist_attraction"],
  EVENT: ["movie_theater", "performing_arts_theater"],
};

/**
 * Converts an array of our Category enums to Google Places type strings.
 * Used by the cache layer to translate categories before calling searchNearby.
 */
export function categoriesToGoogleTypes(categories: readonly Category[]): readonly string[] {
  return categories.flatMap((cat) => CATEGORY_TO_GOOGLE_TYPES[cat]);
}

// ---------------------------------------------------------------------------
// Response types (Google Places API v1 shape)
// ---------------------------------------------------------------------------

type GoogleOpeningHours = {
  readonly openNow?: boolean;
  readonly weekdayDescriptions?: readonly string[];
};

type GooglePlace = {
  readonly id: string;
  readonly displayName: { readonly text: string };
  readonly formattedAddress: string;
  readonly location: { readonly latitude: number; readonly longitude: number };
  readonly types: readonly string[];
  readonly primaryType?: string;
  readonly priceLevel?: string;
  readonly rating?: number;
  readonly userRatingCount?: number;
  readonly photos?: readonly { readonly name: string }[];
  readonly editorialSummary?: { readonly text?: string };
  readonly regularOpeningHours?: GoogleOpeningHours;
  readonly currentOpeningHours?: GoogleOpeningHours;
  readonly websiteUri?: string;
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
  const readiness = getGooglePlacesReadiness();
  if (!readiness.ready) {
    throw new Error("GOOGLE_PLACES_API_KEY environment variable is not set");
  }
  const apiKey = process.env.GOOGLE_PLACES_API_KEY as string;

  const body = {
    includedTypes: types,
    maxResultCount: 20,
    locationRestriction: {
      circle: {
        center: { latitude: location.lat, longitude: location.lng },
        radius,
      },
    },
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
    const errorBody = await response.text();
    const trimmedErrorBody = errorBody.trim();

    if (trimmedErrorBody) {
      console.error("[Google Places] searchNearby failed", {
        status: response.status,
        statusText,
        body: trimmedErrorBody,
      });
    }

    throw new Error(
      trimmedErrorBody
        ? `Google Places API error: ${response.status} ${statusText} - ${trimmedErrorBody}`
        : `Google Places API error: ${response.status} ${statusText}`,
    );
  }

  const data = await response.json();
  const places: readonly GooglePlace[] = filterDeniedFirstDateVenues(
    ((data.places ?? []) as readonly GooglePlace[]).map((place) => ({
      ...place,
      name: place.displayName.text,
    })),
  ).map((place) => {
    const { name, ...rest } = place;
    void name;
    return rest;
  });

  const candidates: readonly PlaceCandidate[] = places.map((place) => {
    const photoReferences = (place.photos ?? []).map((photo) => photo.name);
    const priceLevel = parsePriceLevel(place.priceLevel);
    const editorialSummary = place.editorialSummary?.text?.trim();
    const hoursSource = place.currentOpeningHours ?? place.regularOpeningHours;
    const openingHours =
      hoursSource && typeof hoursSource.openNow === "boolean"
        ? {
            openNow: hoursSource.openNow,
            weekdayText: hoursSource.weekdayDescriptions ?? [],
          }
        : undefined;
    const website = place.websiteUri?.trim();

    return {
      placeId: place.id,
      name: place.displayName.text,
      address: place.formattedAddress,
      location: {
        lat: place.location.latitude,
        lng: place.location.longitude,
        label: place.displayName.text,
      },
      types: place.types,
      primaryType: place.primaryType ?? null,
      priceLevel,
      rating: place.rating ?? 0,
      reviewCount: place.userRatingCount ?? 0,
      photoReferences,
      photoReference: photoReferences[0] ?? null,
      photoUrls: buildGooglePlacePhotoUrls(photoReferences),
      ...(editorialSummary ? { editorialSummary } : {}),
      ...(openingHours ? { openingHours } : {}),
      ...(website ? { website } : {}),
      sourceType: "places" as const,
    };
  });

  if (maxPrice <= 0) {
    return candidates;
  }

  return candidates.filter(
    (candidate) =>
      candidate.priceLevel === 0 || candidate.priceLevel <= maxPrice,
  );
}

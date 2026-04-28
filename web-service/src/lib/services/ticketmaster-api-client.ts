import type { Location } from "../types/preference";
import type { PlaceCandidate } from "../types/venue";

const TM_DISCOVERY_URL = "https://app.ticketmaster.com/discovery/v2/events.json";

/**
 * Ticketmaster segment IDs we allow.
 * NEVER include KZFzniwnSyZfZ7v7nE (Music) — that surfaces stadium concerts,
 * not intimate first-date venues.
 */
const ALLOWED_SEGMENT_IDS = [
  "KZFzniwnSyZfZ7v7nJ", // Arts & Theatre
  "KZFzniwnSyZfZ7v7nn", // Comedy (sub-segment under Arts & Theatre on some configs)
] as const;

// ---------------------------------------------------------------------------
// Ticketmaster Discovery API response shapes
// ---------------------------------------------------------------------------

type TmVenue = {
  readonly name?: string;
  readonly address?: { readonly line1?: string };
  readonly city?: { readonly name?: string };
  readonly state?: { readonly stateCode?: string };
  readonly location?: { readonly latitude?: string; readonly longitude?: string };
};

type TmEvent = {
  readonly id: string;
  readonly name: string;
  readonly url?: string;
  readonly dates?: {
    readonly start?: { readonly dateTime?: string };
  };
  readonly classifications?: ReadonlyArray<{
    readonly segment?: { readonly id?: string; readonly name?: string };
    readonly genre?: { readonly id?: string; readonly name?: string };
  }>;
  readonly _embedded?: {
    readonly venues?: readonly TmVenue[];
  };
  readonly popularity?: number;
  readonly info?: string;
  readonly pleaseNote?: string;
};

type TmResponse = {
  readonly _embedded?: { readonly events?: readonly TmEvent[] };
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildAddress(venue: TmVenue): string {
  const parts = [
    venue.address?.line1,
    venue.city?.name,
    venue.state?.stateCode,
  ].filter(Boolean);
  return parts.join(", ");
}

/**
 * Maps a Ticketmaster genre name to Google Places-compatible type strings so
 * that `mapGoogleTypeToCategory` classifies the event correctly as EVENT.
 * Falls back to `performing_arts_theater` for unrecognised genres.
 */
function tmGenreToGoogleTypes(genreName: string | undefined): readonly string[] {
  const genre = genreName?.toLowerCase() ?? "";
  if (genre.includes("comedy")) return ["comedy_club", "performing_arts_theater"];
  if (genre.includes("theatre") || genre.includes("theater") || genre.includes("broadway")) {
    return ["performing_arts_theater"];
  }
  if (genre.includes("opera") || genre.includes("classical")) return ["opera_house", "performing_arts_theater"];
  if (genre.includes("concert")) return ["concert_hall", "performing_arts_theater"];
  return ["performing_arts_theater"];
}

function toPlaceCandidate(event: TmEvent): PlaceCandidate | null {
  const venue = event._embedded?.venues?.[0];
  if (!venue) return null;

  const lat = venue.location?.latitude ? parseFloat(venue.location.latitude) : NaN;
  const lng = venue.location?.longitude ? parseFloat(venue.location.longitude) : NaN;
  if (isNaN(lat) || isNaN(lng)) return null;

  const scheduledAt = event.dates?.start?.dateTime
    ? new Date(event.dates.start.dateTime)
    : undefined;

  const venueName = venue.name ?? event.name;
  const address = buildAddress(venue);
  const eventDescription = event.info ?? event.pleaseNote;
  const genreName = event.classifications?.[0]?.genre?.name;
  const types = tmGenreToGoogleTypes(genreName);
  const primaryType = types[0] ?? "performing_arts_theater";

  return {
    placeId: `ticketmaster:${event.id}`,
    name: event.name,
    address,
    location: { lat, lng, label: venueName },
    types,
    primaryType,
    priceLevel: 0,
    rating: 0,
    reviewCount: 0,
    sourceType: "ticketmaster",
    ...(scheduledAt ? { scheduledAt } : {}),
    ...(event.url ? { eventUrl: event.url } : {}),
    ...(typeof event.popularity === "number"
      ? { attendanceSignal: event.popularity }
      : {}),
    ...(eventDescription ? { eventDescription } : {}),
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetches nearby arts/comedy events from Ticketmaster Discovery API v2.
 * Music events are explicitly excluded — we only surface intimate, first-date
 * appropriate events like comedy shows, theater, and improv.
 *
 * @param location     Center point for the search
 * @param radiusMeters Search radius in meters (converted to km for the API)
 * @returns            Array of PlaceCandidate objects, or empty array on failure
 */
export async function fetchTicketmasterEventCandidates(
  location: Location,
  radiusMeters: number,
): Promise<readonly PlaceCandidate[]> {
  const apiKey = process.env.TICKETMASTER_API_KEY;

  if (!apiKey) {
    console.warn(
      "[fetchTicketmasterEventCandidates] TICKETMASTER_API_KEY not set — skipping",
    );
    return [];
  }

  const radiusKm = Math.round(radiusMeters / 1000);
  const params = new URLSearchParams({
    apikey: apiKey,
    latlong: `${location.lat},${location.lng}`,
    radius: String(radiusKm),
    unit: "km",
    segmentId: ALLOWED_SEGMENT_IDS.join(","),
    size: "20",
    sort: "relevance,desc",
  });

  const url = `${TM_DISCOVERY_URL}?${params.toString()}`;

  console.info("[fetchTicketmasterEventCandidates] fetching", {
    lat: location.lat,
    lng: location.lng,
    radiusKm,
  });

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Ticketmaster API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as TmResponse;
    const events = data._embedded?.events ?? [];

    const candidates = events
      .map(toPlaceCandidate)
      .filter((c): c is PlaceCandidate => c !== null);

    console.info("[fetchTicketmasterEventCandidates] results", {
      eventCount: events.length,
      candidateCount: candidates.length,
      lat: location.lat,
      lng: location.lng,
    });

    return candidates;
  } catch (err) {
    console.error("[fetchTicketmasterEventCandidates] failed", err);
    return [];
  }
}

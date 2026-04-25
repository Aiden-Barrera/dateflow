import type { Location } from "../types/preference";
import type { PlaceCandidate } from "../types/venue";
import { fetchMeetupEventCandidates } from "./meetup-api-client";
import { fetchTicketmasterEventCandidates } from "./ticketmaster-api-client";

/**
 * Two events are considered duplicates if their venues are within this many
 * meters of each other. Covers the case where Meetup and Ticketmaster both
 * list the same comedy show at the same venue with slightly different coords.
 */
const DEDUP_RADIUS_METERS = 100;

/**
 * Haversine distance between two lat/lng points, in meters.
 */
function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6_371_000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const aVal =
    sinDLat * sinDLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinDLng * sinDLng;
  return R * 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal));
}

/**
 * Deduplicates candidates where two events share a venue within DEDUP_RADIUS_METERS.
 * When a duplicate is found, the first-seen candidate is kept (Meetup takes
 * priority since it tends to have richer community context).
 */
function deduplicateByProximity(
  candidates: readonly PlaceCandidate[],
): readonly PlaceCandidate[] {
  const kept: PlaceCandidate[] = [];

  for (const candidate of candidates) {
    const isDuplicate = kept.some(
      (existing) =>
        haversineMeters(existing.location, candidate.location) <=
        DEDUP_RADIUS_METERS,
    );

    if (!isDuplicate) {
      kept.push(candidate);
    }
  }

  return kept;
}

/**
 * Orchestrates live event fetching from Meetup and Ticketmaster concurrently.
 * Uses Promise.allSettled so a failure in one source never blocks the other.
 * Returns empty array if both sources fail.
 *
 * @param location     Midpoint between the two users
 * @param radiusMeters Search radius in meters
 */
export async function fetchLiveEventCandidates(
  location: Location,
  radiusMeters: number,
): Promise<readonly PlaceCandidate[]> {
  const [meetupResult, tmResult] = await Promise.allSettled([
    fetchMeetupEventCandidates(location, radiusMeters),
    fetchTicketmasterEventCandidates(location, radiusMeters),
  ]);

  const meetupCandidates =
    meetupResult.status === "fulfilled" ? meetupResult.value : [];
  const tmCandidates =
    tmResult.status === "fulfilled" ? tmResult.value : [];

  // Meetup first so it wins dedup ties
  const combined = [...meetupCandidates, ...tmCandidates];

  return deduplicateByProximity(combined);
}

import type { Location } from "../types/preference";
import type { PlaceCandidate } from "../types/venue";
import { fetchTicketmasterEventCandidates } from "./ticketmaster-api-client";

/**
 * Fetches live event candidates for venue generation.
 *
 * Currently uses Ticketmaster Discovery API (Arts & Theatre + Comedy only).
 * The function signature is intentionally generic so a second source can be
 * added here without touching the venue generation service.
 *
 * @param location     Midpoint between the two users
 * @param radiusMeters Search radius in meters
 */
export async function fetchLiveEventCandidates(
  location: Location,
  radiusMeters: number,
): Promise<readonly PlaceCandidate[]> {
  return fetchTicketmasterEventCandidates(location, radiusMeters);
}

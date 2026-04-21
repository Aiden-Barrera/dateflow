import type { Category, Location } from "./preference";
import { normalizeProxiedPhotoUrl } from "../places-photo-url";

/**
 * The five independent scoring dimensions that measure how well a venue
 * matches the couple's preferences and suitability for a first date.
 * Each score is 0–1.
 *
 * **categoryOverlap:** Percentage of both users' category preferences met.
 *   If Person A wants [RESTAURANT, ACTIVITY] and Person B wants [RESTAURANT, BAR],
 *   this venue (RESTAURANT) = 100% overlap. A venue with no matching category = 0.
 *
 * **distanceToMidpoint:** How close the venue is to the geographic midpoint
 *   between both users' locations. Venues close to the midpoint score higher
 *   (fair to both). 1.0 = at midpoint, 0.0 = very far away.
 *
 * **firstDateSuitability:** AI-assessed suitability for a first date.
 *   High-end fine dining = lower (more formal, less exploratory).
 *   Casual restaurant or activity = higher (conducive to conversation).
 *   Scored by Claude based on venue type, price level, atmosphere signals.
 *
 * **qualitySignal:** Google Places rating + review count normalized to 0–1.
 *   A well-reviewed venue with 500+ reviews = higher. A new venue with 3 reviews = lower.
 *   Captures "is this a real, trusted establishment?"
 *
 * **timeOfDayFit:** How well the venue suits the round's time-of-day context.
 *   Round 1 (evening): restaurant/bar higher; activity lower.
 *   Round 2 (afternoon): activity higher; dinner restaurant lower.
 *   Round 3 (morning): cafe/breakfast venue higher; nightclub lower.
 */
export type VenueScore = {
  readonly categoryOverlap: number;
  readonly distanceToMidpoint: number;
  readonly firstDateSuitability: number;
  readonly qualitySignal: number;
  readonly timeOfDayFit: number;
  readonly composite: number;
};

export const VENUE_SCORE_WEIGHTS = {
  categoryOverlap: 0.3,
  distanceToMidpoint: 0.25,
  firstDateSuitability: 0.25,
  qualitySignal: 0.15,
  timeOfDayFit: 0.05,
} as const;

export function computeVenueComposite(
  score: Omit<VenueScore, "composite">
): number {
  return (
    score.categoryOverlap * VENUE_SCORE_WEIGHTS.categoryOverlap +
    score.distanceToMidpoint * VENUE_SCORE_WEIGHTS.distanceToMidpoint +
    score.firstDateSuitability * VENUE_SCORE_WEIGHTS.firstDateSuitability +
    score.qualitySignal * VENUE_SCORE_WEIGHTS.qualitySignal +
    score.timeOfDayFit * VENUE_SCORE_WEIGHTS.timeOfDayFit
  );
}

/**
 * A venue generated and stored for a session.
 * The composite score is the weighted average of the five dimension scores.
 *
 * **round:** 1, 2, or 3. User swipes through rounds progressively (DS-04).
 * **position:** 1-4 within the round (the venue's rank in that round).
 * **tags:** AI-generated labels ("cozy", "live music", "romantic", etc.) that
 *   explain why this venue was chosen. Shown in the UI to build trust in the curation.
 * **photoUrls:** Ordered photo collection for the venue. The first item is the
 *   primary photo used by older single-image surfaces.
 * **photoUrl:** Backward-compatible primary photo, or null if not available.
 *   Always a static URL (proxied server-side), never leaks Google Places API key.
 * **category:** The primary category (RESTAURANT, BAR, ACTIVITY, EVENT).
 *   Normalized from Google Places types.
 * **rating, priceLevel:** From Google Places. Rating is 0–5 (decimal).
 *   priceLevel is 1–4 ($ to $$$$).
 */
export type Venue = {
  readonly id: string;
  readonly sessionId: string;
  readonly placeId: string;
  readonly name: string;
  readonly category: Category;
  readonly address: string;
  readonly lat: number;
  readonly lng: number;
  readonly priceLevel: number;
  readonly rating: number;
  readonly photoUrls: readonly string[];
  readonly photoUrl: string | null;
  readonly tags: readonly string[];
  readonly round: number;
  readonly position: number;
  readonly score: VenueScore;
};

// ---------------------------------------------------------------------------
// Database layer
// ---------------------------------------------------------------------------

/**
 * The raw row shape returned by Supabase when querying the venues table.
 * Column names are snake_case. Scores are stored as individual numeric columns.
 * The location (lat, lng) is flattened in the table (not a JSONB object like Location).
 */
export type VenueRow = {
  readonly id: string;
  readonly session_id: string;
  readonly place_id: string;
  readonly name: string;
  readonly category: Category;
  readonly address: string;
  readonly lat: number;
  readonly lng: number;
  readonly price_level: number;
  readonly rating: number;
  readonly photo_urls?: string[] | null;
  readonly photo_url: string | null;
  readonly tags: string[];
  readonly round: number;
  readonly position: number;
  readonly score_category_overlap: number;
  readonly score_distance_to_midpoint: number;
  readonly score_first_date_suitability: number;
  readonly score_quality_signal: number;
  readonly score_time_of_day_fit: number;
};

function resolvePhotoUrls(row: Pick<VenueRow, "photo_url" | "photo_urls">): readonly string[] {
  if (Array.isArray(row.photo_urls) && row.photo_urls.length > 0) {
    return row.photo_urls.map(normalizeProxiedPhotoUrl);
  }

  return row.photo_url ? [normalizeProxiedPhotoUrl(row.photo_url)] : [];
}

/**
 * Converts a raw Supabase row into an app-level Venue.
 * Groups the five score columns into a single VenueScore object.
 */
export function toVenue(row: VenueRow): Venue {
  const photoUrls = resolvePhotoUrls(row);

  return {
    id: row.id,
    sessionId: row.session_id,
    placeId: row.place_id,
    name: row.name,
    category: row.category,
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    priceLevel: row.price_level,
    rating: row.rating,
    photoUrls,
    photoUrl: photoUrls[0] ?? null,
    tags: row.tags,
    round: row.round,
    position: row.position,
    score: {
      categoryOverlap: row.score_category_overlap,
      distanceToMidpoint: row.score_distance_to_midpoint,
      firstDateSuitability: row.score_first_date_suitability,
      qualitySignal: row.score_quality_signal,
      timeOfDayFit: row.score_time_of_day_fit,
      composite: computeVenueComposite({
        categoryOverlap: row.score_category_overlap,
        distanceToMidpoint: row.score_distance_to_midpoint,
        firstDateSuitability: row.score_first_date_suitability,
        qualitySignal: row.score_quality_signal,
        timeOfDayFit: row.score_time_of_day_fit,
      }),
    },
  };
}

// ---------------------------------------------------------------------------
// Service layer intermediate types
// ---------------------------------------------------------------------------

/**
 * A venue candidate returned by Google Places Nearby Search API.
 * These are raw results before any custom scoring or filtering.
 *
 * **photoReferences:** Ordered Google photo references for this place.
 * **photoReference:** Backward-compatible primary reference.
 * **photoUrls:** Ordered proxied photo URLs derived from the references.
 *
 * **types:** Google Places types (e.g., "restaurant", "bar", "tourist_attraction").
 *   The VenueGenerationService normalizes these to our Category enum.
 */
export type PlaceCandidate = {
  readonly placeId: string;
  readonly name: string;
  readonly address: string;
  readonly location: Location;
  readonly types: readonly string[];
  readonly primaryType?: string | null;
  readonly priceLevel: number;
  readonly rating: number;
  readonly reviewCount: number;
  readonly photoReferences: readonly string[];
  readonly photoReference: string | null;
  readonly photoUrls: readonly string[];
};

/**
 * A PlaceCandidate that has been scored and curated by the AI service.
 * This is the output of AICurationService.scoreAndCurate().
 *
 * **score:** The five-dimensional score assigned by Claude.
 * **tags:** AI-generated explanations (e.g., "cozy", "romantic", "live music")
 *   that explain why this venue was chosen. These appear in the UI to build
 *   confidence in the curation.
 *
 * Note: A ScoredVenue is NOT a Venue yet. It lacks the database id, round/position
 * assignment, and resolved photo URL. Those are added when the venue is stored.
 */
export type ScoredVenue = {
  readonly placeId: string;
  readonly score: VenueScore;
  readonly tags: readonly string[];
};

export type CuratedVenueCandidate = PlaceCandidate & {
  readonly category: Category;
  readonly score: VenueScore;
  readonly tags: readonly string[];
};

import type { PlaceCandidate } from "../types/venue";

// ---------------------------------------------------------------------------
// Hard rules — any venue with these types is immediately rejected
// ---------------------------------------------------------------------------

/**
 * Google Places types that indicate a venue is unsuitable for a first date.
 *
 * - lodging/hotel: private rooms, not a public meeting spot
 * - gas_station/car_wash/car_repair: not a social venue
 * - funeral_home/cemetery: self-explanatory
 * - storage/moving_company: commercial, not social
 * - casino/gambling: risky environment for strangers
 * - gun range: not a relaxed first-date setting
 */
const UNSAFE_TYPES = new Set([
  "lodging",
  "hotel",
  "motel",
  "campground",
  "gas_station",
  "car_wash",
  "car_repair",
  "car_dealer",
  "funeral_home",
  "cemetery",
  "storage",
  "moving_company",
  "casino",
  "gambling",
  "laundry",
  "locksmith",
  "roofing_contractor",
  "electrician",
  "plumber",
  "hardware_store",
  "convenience_store",
]);

// ---------------------------------------------------------------------------
// Thresholds
// ---------------------------------------------------------------------------

/** Minimum Google rating (0–5) to pass the quality floor. */
const MIN_RATING = 3.5;

/** Minimum number of Google reviews to pass the social proof check. */
const MIN_REVIEW_COUNT = 50;

/**
 * Review count used to normalize the review score.
 * A venue with this many reviews gets the maximum review contribution.
 * More reviews than this don't increase the score further.
 */
const REVIEW_COUNT_CAP = 500;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if any of the venue's Google types are in the unsafe set.
 */
function hasUnsafeType(types: readonly string[]): boolean {
  return types.some((type) => UNSAFE_TYPES.has(type));
}

/**
 * Returns true if the venue passes ALL hard safety rules.
 * A venue must clear every gate to be considered safe:
 *   1. No unsafe types
 *   2. Rating ≥ 3.5
 *   3. At least 50 reviews (social proof that it's a real, visited place)
 */
function passesHardRules(candidate: PlaceCandidate): boolean {
  if (hasUnsafeType(candidate.types)) return false;
  if (candidate.rating < MIN_RATING) return false;
  if (candidate.reviewCount < MIN_REVIEW_COUNT) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Filters a list of venue candidates, removing any that fail first-date
 * safety criteria.
 *
 * This is a hard gate — venues that fail are gone, not downranked. The AI
 * curation service never sees them. This keeps safety deterministic and
 * auditable: if a venue is rejected, you can trace it to a specific rule.
 *
 * @param candidates  Raw PlaceCandidates from Google Places (via cache or API)
 * @returns           Only the candidates that pass all safety rules
 */
export function applySafetyFilter(
  candidates: readonly PlaceCandidate[]
): readonly PlaceCandidate[] {
  return candidates.filter(passesHardRules);
}

/**
 * Scores a single venue's safety on a 0–1 scale.
 *
 * Returns 0 if the venue fails any hard rule (same criteria as applySafetyFilter).
 * Otherwise, returns a score based on:
 *   - Rating contribution (60%): how far above the 3.5 minimum the rating is
 *   - Review contribution (40%): log-scaled review count, capped at 500
 *
 * This score feeds into the `firstDateSuitability` dimension of VenueScore,
 * giving the AI curation service a numeric signal for safety quality.
 */
export function scoreSafety(candidate: PlaceCandidate): number {
  if (!passesHardRules(candidate)) return 0;

  // Rating contribution: 3.5 → 0.0, 5.0 → 1.0
  const ratingScore = (candidate.rating - MIN_RATING) / (5 - MIN_RATING);

  // Review contribution: log-scaled so 50 → 0.0, 500+ → 1.0.
  // We normalize log(reviewCount) between MIN_REVIEW_COUNT and REVIEW_COUNT_CAP
  // to keep the score in [0, 1] with diminishing returns.
  const clampedReviews = Math.min(candidate.reviewCount, REVIEW_COUNT_CAP);
  const minLog = Math.log(MIN_REVIEW_COUNT);
  const maxLog = Math.log(REVIEW_COUNT_CAP);
  const reviewScore = (Math.log(clampedReviews) - minLog) / (maxLog - minLog);

  // Weighted blend: rating matters more, but review count adds confidence
  return ratingScore * 0.6 + reviewScore * 0.4;
}

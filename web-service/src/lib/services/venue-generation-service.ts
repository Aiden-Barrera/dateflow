import { getSupabaseServerClient } from "../supabase-server";
import type {
  CandidatePoolSource,
  GenerationStrategy,
} from "../types/candidate-pool";
import type { BudgetLevel, Category, Preference } from "../types/preference";
import { toVenue, type Venue, type VenueRow, type PlaceCandidate, type CuratedVenueCandidate } from "../types/venue";
import { getBothPreferences } from "./preference-service";
import { calculateMidpoint, distanceBetween } from "./midpoint-calculator";
import { buildWhyPicked } from "./venue-why-picked";
import { searchNearbyWithCache } from "./places-api-cached";
import {
  buildGooglePlacePhotoUrl,
  mapGoogleTypeToCategory,
} from "./places-api-client";
import { applySafetyFilter } from "./safety-filter";
import { scoreAndCurate } from "./ai-curation-service";
import { fetchLiveEventCandidates } from "./event-enrichment-service";
import {
  fetchActiveSponsoredBoosts,
  fetchPopularityBoosts,
} from "./sponsored-venue-service";

/**
 * Radius expansion ladder used when the initial search returns too few safe
 * candidates. Each tier is tried in order; generation stops at the first
 * radius that yields at least MIN_CANDIDATES_TO_PROCEED safe venues.
 *
 * 2 km → 5 km → 10 km → 20 km
 */
const SEARCH_RADIUS_LADDER_METERS = [2_000, 5_000, 10_000, 20_000] as const;

/** Minimum number of safety-filtered candidates needed to proceed to AI curation. */
const MIN_CANDIDATES_TO_PROCEED = 3;

/** Max venues per category in a single round (prevents restaurants from filling all 4 slots). */
const MAX_PER_CATEGORY_PER_ROUND = 2;

/**
 * Picks `count` venues from a ranked list while enforcing category diversity.
 *
 * Takes candidates in rank order but caps each category at
 * MAX_PER_CATEGORY_PER_ROUND. This prevents e.g. 4 restaurants appearing in
 * round 1 when the user also selected Activity and Event.
 *
 * Falls back to any remaining venues if there aren't enough diverse ones.
 */
function pickDiverseRound(
  ranked: readonly CuratedVenueCandidate[],
  count: number,
): readonly CuratedVenueCandidate[] {
  const categoryCounts = new Map<Category, number>();
  const picked: CuratedVenueCandidate[] = [];
  const overflow: CuratedVenueCandidate[] = [];

  for (const candidate of ranked) {
    const current = categoryCounts.get(candidate.category) ?? 0;
    if (current < MAX_PER_CATEGORY_PER_ROUND) {
      picked.push(candidate);
      categoryCounts.set(candidate.category, current + 1);
    } else {
      overflow.push(candidate);
    }
    if (picked.length === count) break;
  }

  // Fill remaining slots from overflow if diversity enforcement left gaps
  for (const candidate of overflow) {
    if (picked.length >= count) break;
    picked.push(candidate);
  }

  return picked;
}

function budgetToMaxPrice(budget: BudgetLevel): number {
  if (budget === "BUDGET") return 1;
  if (budget === "MODERATE") return 2;
  return 4;
}

function stricterBudget(
  preferences: readonly [Preference, Preference]
): BudgetLevel {
  const [a, b] = preferences;
  const rank: Record<BudgetLevel, number> = {
    BUDGET: 1,
    MODERATE: 2,
    UPSCALE: 3,
  };

  return rank[a.budget] <= rank[b.budget] ? a.budget : b.budget;
}

function mergedCategories(
  preferences: readonly [Preference, Preference]
): readonly Category[] {
  return [...new Set([...preferences[0].categories, ...preferences[1].categories])];
}

async function updateSessionStatus(
  sessionId: string,
  nextStatus: "generating" | "ready_to_swipe" | "generation_failed",
  currentStatuses:
    | "both_ready"
    | "generation_failed"
    | "generating"
    | readonly ("both_ready" | "generation_failed" | "generating")[]
): Promise<void> {
  const supabase = getSupabaseServerClient();
  const statuses = Array.isArray(currentStatuses)
    ? currentStatuses
    : [currentStatuses];
  const query = supabase
    .from("sessions")
    .update({ status: nextStatus })
    .eq("id", sessionId);

  const filteredQuery =
    statuses.length === 1
      ? query.eq("status", statuses[0])
      : query.in("status", statuses);

  const { data, error } = await filteredQuery.select("id");

  if (error) {
    throw new Error(error.message);
  }

  if (!data || data.length !== 1) {
    throw new Error(
      `Failed to transition session to ${nextStatus}: expected exactly one row update`
    );
  }
}

type InsertVenueRow = {
  readonly session_id: string;
  readonly place_id: string;
  readonly name: string;
  readonly category: Category;
  readonly address: string;
  readonly lat: number;
  readonly lng: number;
  readonly price_level: number;
  readonly rating: number;
  readonly photo_urls: readonly string[];
  readonly photo_url: string | null;
  readonly tags: readonly string[];
  readonly round: number;
  readonly position: number;
  readonly score_category_overlap: number;
  readonly score_distance_to_midpoint: number;
  readonly score_first_date_suitability: number;
  readonly score_quality_signal: number;
  readonly score_time_of_day_fit: number;
  readonly generation_batch_id: string;
  readonly surfaced_cycle: number;
  readonly editorial_summary: string | null;
  readonly user_rating_count: number | null;
  readonly opening_hours:
    | { readonly open_now: boolean; readonly weekday_text: readonly string[] }
    | null;
  readonly distance_meters: number | null;
  readonly website: string | null;
  readonly why_picked: string | null;
  readonly source_type: string;
  readonly scheduled_at: string | null;
  readonly event_url: string | null;
  readonly duration_minutes: number | null;
  readonly age_restriction: string | null;
};

async function insertVenues(rows: readonly InsertVenueRow[]): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("venues")
    .upsert(rows, { onConflict: "session_id,round,position" });

  if (error) {
    throw new Error(error.message);
  }
}

type InsertCandidatePoolItemRow = {
  readonly pool_id: string;
  readonly place_id: string;
  readonly name: string;
  readonly category: Category;
  readonly address: string;
  readonly lat: number;
  readonly lng: number;
  readonly price_level: number;
  readonly rating: number;
  readonly photo_urls: readonly string[];
  readonly photo_url: string | null;
  readonly raw_types: readonly string[];
  readonly raw_tags: readonly string[];
  readonly source_rank: number;
};

async function createCandidatePool(
  sessionId: string,
  source: CandidatePoolSource,
): Promise<string> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("session_candidate_pools")
    .insert({
      session_id: sessionId,
      source,
    })
    .select("id")
    .single<{ id: string }>();

  if (error) {
    throw new Error(error.message);
  }

  return data.id;
}

async function insertCandidatePoolItems(
  rows: readonly InsertCandidatePoolItemRow[],
): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("session_candidate_pool_items")
    .upsert(rows, { onConflict: "pool_id,place_id" });

  if (error) {
    throw new Error(error.message);
  }
}

async function createGenerationBatch(
  sessionId: string,
  poolId: string,
  batchNumber: number,
  generationStrategy: GenerationStrategy,
): Promise<string> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("venue_generation_batches")
    .insert({
      session_id: sessionId,
      pool_id: poolId,
      batch_number: batchNumber,
      generation_strategy: generationStrategy,
    })
    .select("id")
    .single<{ id: string }>();

  if (error) {
    throw new Error(error.message);
  }

  return data.id;
}

export async function generateVenues(sessionId: string): Promise<readonly Venue[]> {
  await updateSessionStatus(sessionId, "generating", [
    "both_ready",
    "generation_failed",
  ]);

  try {
    const preferences = await getBothPreferences(sessionId);

    // Guard against placeholder (0, 0) coordinates written by manual location
    // entry. A midpoint involving (0, 0) lands in the Atlantic Ocean, causing
    // Google Places to return nothing — and previously that empty result got
    // cached, poisoning every future generation attempt for the same key.
    for (const pref of preferences) {
      if (pref.location.lat === 0 && pref.location.lng === 0) {
        throw new Error(
          `Invalid location coordinates (0, 0) for session ${sessionId} — manual location entry may not have resolved a real address.`
        );
      }
    }

    const midpoint = calculateMidpoint(
      preferences[0].location,
      preferences[1].location
    );
    const categories = mergedCategories(preferences);
    const maxPrice = budgetToMaxPrice(stricterBudget(preferences));

    // Search with radius expansion: start at 2 km and widen up to 20 km until
    // we have enough safety-filtered candidates to run AI curation. This handles
    // suburban and rural midpoints where the tighter radius yields too few venues.
    let placeCandidates: readonly PlaceCandidate[] = [];
    let usedRadius: number = SEARCH_RADIUS_LADDER_METERS[0];
    for (const radius of SEARCH_RADIUS_LADDER_METERS) {
      usedRadius = radius;
      const rawCandidates = await searchNearbyWithCache(
        midpoint,
        radius,
        categories,
        maxPrice
      );
      placeCandidates = applySafetyFilter(rawCandidates, categories);
      if (placeCandidates.length >= MIN_CANDIDATES_TO_PROCEED) break;

      console.info("[generateVenues] radius expansion triggered", {
        sessionId,
        radius,
        safeCandidateCount: placeCandidates.length,
        required: MIN_CANDIDATES_TO_PROCEED,
      });
    }

    const wantsLiveEvents = categories.some(
      (cat) => cat === "EVENT" || cat === "ACTIVITY",
    );
    // Live event candidates intentionally bypass applySafetyFilter: the rating
    // and review-count gates are meaningless for Ticketmaster events (always 0),
    // and the deny-listed type check is irrelevant since TM types are pre-scoped
    // to Arts & Theatre + Comedy at the API level.
    const liveEventCandidates = wantsLiveEvents
      ? await fetchLiveEventCandidates(midpoint, usedRadius)
      : [];

    const safeCandidates = [...placeCandidates, ...liveEventCandidates];

    if (safeCandidates.length === 0) {
      throw new Error(
        "No venues found near your midpoint. Try entering locations closer together or choosing different categories."
      );
    }
    const poolId = await createCandidatePool(sessionId, "initial_generation");

    await insertCandidatePoolItems(
      safeCandidates.map((candidate, index) => ({
        pool_id: poolId,
        place_id: candidate.placeId,
        name: candidate.name,
        category: mapGoogleTypeToCategory(candidate.types, candidate.primaryType),
        address: candidate.address,
        lat: candidate.location.lat,
        lng: candidate.location.lng,
        price_level: candidate.priceLevel === 0 ? 1 : candidate.priceLevel,
        rating: candidate.rating,
        photo_urls: candidate.photoUrls ?? [],
        photo_url: buildGooglePlacePhotoUrl(candidate.photoReference ?? null),
        raw_types: candidate.types,
        raw_tags: [],
        source_rank: index + 1,
      })),
    );

    const generationBatchId = await createGenerationBatch(
      sessionId,
      poolId,
      1,
      "initial_pool_rank",
    );

    // Fetch sponsored and popularity boosts once — non-critical, errors return empty map
    const allPlaceIds = safeCandidates.map((c) => c.placeId);
    const [sponsoredBoosts, popularityBoosts] = await Promise.all([
      fetchActiveSponsoredBoosts(allPlaceIds),
      fetchPopularityBoosts(allPlaceIds),
    ]);

    const selectedRows: InsertVenueRow[] = [];
    let remaining = [...safeCandidates];

    for (const round of [1, 2, 3] as const) {
      const curated = await scoreAndCurate(
        remaining,
        preferences,
        round,
        midpoint,
        sponsoredBoosts,
        popularityBoosts,
      );
      const roundPicks = pickDiverseRound(curated, 4);

      roundPicks.forEach((venue, index) => {
        const distanceMeters = Math.round(
          distanceBetween(midpoint, venue.location),
        );
        const whyPicked =
          venue.whyPicked ?? buildWhyPicked(venue, distanceMeters);
        selectedRows.push({
          session_id: sessionId,
          place_id: venue.placeId,
          name: venue.name,
          category: venue.category,
          address: venue.address,
          lat: venue.location.lat,
          lng: venue.location.lng,
          price_level: venue.priceLevel === 0 ? 1 : venue.priceLevel,
          rating: venue.rating,
          photo_urls: venue.photoUrls ?? [],
          photo_url: buildGooglePlacePhotoUrl(venue.photoReference ?? null),
          tags: venue.tags,
          round,
          position: index + 1,
          score_category_overlap: venue.score.categoryOverlap,
          score_distance_to_midpoint: venue.score.distanceToMidpoint,
          score_first_date_suitability: venue.score.firstDateSuitability,
          score_quality_signal: venue.score.qualitySignal,
          score_time_of_day_fit: venue.score.timeOfDayFit,
          generation_batch_id: generationBatchId,
          surfaced_cycle: 1,
          editorial_summary: venue.editorialSummary ?? null,
          user_rating_count:
            typeof venue.reviewCount === "number" ? venue.reviewCount : null,
          opening_hours: venue.openingHours
            ? {
                open_now: venue.openingHours.openNow,
                weekday_text: venue.openingHours.weekdayText,
              }
            : null,
          distance_meters: distanceMeters,
          website: venue.website ?? null,
          why_picked: whyPicked ?? null,
          source_type: venue.sourceType ?? "places",
          scheduled_at: venue.scheduledAt ? venue.scheduledAt.toISOString() : null,
          event_url: venue.eventUrl ?? null,
          duration_minutes: venue.durationMinutes ?? null,
          age_restriction: venue.ageRestriction ?? null,
        });
      });

      const usedIds = new Set(roundPicks.map((venue) => venue.placeId));
      remaining = remaining.filter((venue) => !usedIds.has(venue.placeId));
    }

    await insertVenues(selectedRows);
    await updateSessionStatus(sessionId, "ready_to_swipe", "generating");

    return getVenues(sessionId);
  } catch (err) {
    await updateSessionStatus(sessionId, "generation_failed", "generating");
    throw err;
  }
}

export async function getVenues(
  sessionId: string,
  round?: number
): Promise<readonly Venue[]> {
  const supabase = getSupabaseServerClient();

  let query = supabase
    .from("venues")
    .select()
    .eq("session_id", sessionId)
    .order("round", { ascending: true })
    .order("position", { ascending: true });

  if (round !== undefined) {
    query = query.eq("round", round);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as VenueRow[]).map(toVenue);
}

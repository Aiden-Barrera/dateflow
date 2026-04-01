import { getSupabaseServerClient } from "../supabase-server";
import type { BudgetLevel, Category, Preference } from "../types/preference";
import { toVenue, type Venue, type VenueRow } from "../types/venue";
import { getBothPreferences } from "./preference-service";
import { calculateMidpoint } from "./midpoint-calculator";
import { searchNearbyWithCache } from "./places-api-cached";
import { applySafetyFilter } from "./safety-filter";
import { scoreAndCurate } from "./ai-curation-service";

const SEARCH_RADIUS_METERS = 2_000;

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
  currentStatus: "both_ready" | "generation_failed" | "generating"
): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("sessions")
    .update({ status: nextStatus })
    .eq("id", sessionId)
    .eq("status", currentStatus);

  if (error) {
    throw new Error(error.message);
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
  readonly photo_url: string | null;
  readonly tags: readonly string[];
  readonly round: number;
  readonly position: number;
  readonly score_category_overlap: number;
  readonly score_distance_to_midpoint: number;
  readonly score_first_date_suitability: number;
  readonly score_quality_signal: number;
  readonly score_time_of_day_fit: number;
};

async function insertVenues(rows: readonly InsertVenueRow[]): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("venues").insert(rows);

  if (error) {
    throw new Error(error.message);
  }
}

export async function generateVenues(sessionId: string): Promise<readonly Venue[]> {
  await updateSessionStatus(sessionId, "generating", "both_ready");

  try {
    const preferences = await getBothPreferences(sessionId);
    const midpoint = calculateMidpoint(
      preferences[0].location,
      preferences[1].location
    );
    const categories = mergedCategories(preferences);
    const maxPrice = budgetToMaxPrice(stricterBudget(preferences));

    const candidates = await searchNearbyWithCache(
      midpoint,
      SEARCH_RADIUS_METERS,
      categories,
      maxPrice
    );
    const safeCandidates = applySafetyFilter(candidates);

    const selectedRows: InsertVenueRow[] = [];
    let remaining = [...safeCandidates];

    for (const round of [1, 2, 3] as const) {
      const curated = await scoreAndCurate(remaining, preferences, round, midpoint);
      const roundPicks = curated.slice(0, 4);

      roundPicks.forEach((venue, index) => {
        selectedRows.push({
          session_id: sessionId,
          place_id: venue.placeId,
          name: venue.name,
          category: venue.category,
          address: venue.address,
          lat: venue.location.lat,
          lng: venue.location.lng,
          price_level: venue.priceLevel,
          rating: venue.rating,
          photo_url: null,
          tags: venue.tags,
          round,
          position: index + 1,
          score_category_overlap: venue.score.categoryOverlap,
          score_distance_to_midpoint: venue.score.distanceToMidpoint,
          score_first_date_suitability: venue.score.firstDateSuitability,
          score_quality_signal: venue.score.qualitySignal,
          score_time_of_day_fit: venue.score.timeOfDayFit,
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

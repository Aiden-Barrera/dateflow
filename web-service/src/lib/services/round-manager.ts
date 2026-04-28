import { getSupabaseServerClient } from "../supabase-server";
import { FINAL_ROUND } from "../swipe-config";
import type { SwipeRow } from "../types/swipe";
import type { VenueRow } from "../types/venue";

export type ForcedResolution = {
  readonly venueId: string;
  readonly reason: "mutual_partial" | "single_like" | "highest_scored";
};

export async function getCurrentRound(sessionId: string): Promise<number> {
  for (const round of [1, 2] as const) {
    const complete = await isRoundComplete(sessionId, round);

    if (!complete) {
      return round;
    }
  }

  return FINAL_ROUND;
}

export async function isRoundComplete(
  sessionId: string,
  round: number,
): Promise<boolean> {
  const venueIds = await getVenueIdsForRound(sessionId, round);

  if (venueIds.length === 0) {
    return false;
  }

  const swipes = await getSwipesForSession(sessionId);
  const roleASwipes = countDistinctVenueSwipes(swipes, venueIds, "a");
  const roleBSwipes = countDistinctVenueSwipes(swipes, venueIds, "b");

  return roleASwipes === venueIds.length && roleBSwipes === venueIds.length;
}

export async function resolveNoMatch(
  sessionId: string,
): Promise<ForcedResolution> {
  const venues = await getVenuesForSession(sessionId);
  const swipes = await getSwipesForSession(sessionId);
  const swipeMap = buildSwipeMap(swipes);

  const singleLikeVenue = venues.find((venue) => {
    const venueSwipes = swipeMap.get(venue.id) ?? [];
    const roleALiked = venueSwipes.some((swipe) => swipe.role === "a" && swipe.liked);
    const roleBLiked = venueSwipes.some((swipe) => swipe.role === "b" && swipe.liked);

    return roleALiked !== roleBLiked;
  });

  if (singleLikeVenue) {
    await finalizeFallbackSuggestion(sessionId, singleLikeVenue.id);

    return {
      venueId: singleLikeVenue.id,
      reason: "single_like",
    };
  }

  const topVenue = [...venues].sort((left, right) => {
    const leftComposite = computeVenueComposite(left);
    const rightComposite = computeVenueComposite(right);

    return rightComposite - leftComposite;
  })[0];

  if (!topVenue) {
    throw new Error(`No venues available for session ${sessionId}`);
  }

  await finalizeFallbackSuggestion(sessionId, topVenue.id);

  return {
    venueId: topVenue.id,
    reason: "highest_scored",
  };
}

async function finalizeFallbackSuggestion(
  sessionId: string,
  venueId: string,
): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("sessions")
    .update({
      status: "fallback_pending",
      matched_venue_id: venueId,
    })
    .eq("id", sessionId);

  if (error) {
    throw new Error(error.message);
  }
}

async function getVenueIdsForRound(
  sessionId: string,
  round: number,
): Promise<readonly string[]> {
  const venues = await getVenuesForSession(sessionId);

  return venues.filter((venue) => venue.round === round).map((venue) => venue.id);
}

async function getVenuesForSession(sessionId: string): Promise<readonly VenueRow[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("venues")
    .select("*")
    .eq("session_id", sessionId);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as VenueRow[];
}

async function getSwipesForSession(sessionId: string): Promise<readonly SwipeRow[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("swipes")
    .select("*")
    .eq("session_id", sessionId);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as SwipeRow[];
}

function countDistinctVenueSwipes(
  swipes: readonly SwipeRow[],
  venueIds: readonly string[],
  role: "a" | "b",
): number {
  const roundVenueIds = new Set(venueIds);

  return new Set(
    swipes
      .filter((swipe) => swipe.role === role && roundVenueIds.has(swipe.venue_id))
      .map((swipe) => swipe.venue_id),
  ).size;
}

function buildSwipeMap(swipes: readonly SwipeRow[]): Map<string, readonly SwipeRow[]> {
  return swipes.reduce((map, swipe) => {
    const existing = map.get(swipe.venue_id) ?? [];
    map.set(swipe.venue_id, [...existing, swipe]);
    return map;
  }, new Map<string, readonly SwipeRow[]>());
}

function computeVenueComposite(venue: VenueRow): number {
  // VenueGenerationService persists normalized 0-1 component scores.
  return (
    venue.score_category_overlap * 0.3 +
    venue.score_distance_to_midpoint * 0.25 +
    venue.score_first_date_suitability * 0.25 +
    venue.score_quality_signal * 0.15 +
    venue.score_time_of_day_fit * 0.05
  );
}

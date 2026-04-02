import { checkAndRecordMatch } from "./match-detector";
import {
  getCurrentRound,
  isRoundComplete,
  resolveNoMatch,
} from "./round-manager";
import { getSupabaseServerClient } from "../supabase-server";
import { FINAL_ROUND } from "../swipe-config";
import type { Role } from "../types/preference";
import { toSwipe, type Swipe, type SwipeRow } from "../types/swipe";
import type { VenueRow } from "../types/venue";

export type SwipeResult = {
  readonly matched: boolean;
  readonly matchedVenueId: string | null;
  readonly roundComplete: boolean;
  readonly currentRound: number;
};

export type RoundCompletion = {
  readonly round: number;
  readonly roleACount: number;
  readonly roleBCount: number;
  readonly total: number;
  readonly complete: boolean;
};

export async function recordSwipe(
  sessionId: string,
  venueId: string,
  role: Role,
  liked: boolean,
): Promise<SwipeResult> {
  if (role !== "a" && role !== "b") {
    throw new Error(`Invalid role: ${role}`);
  }

  const currentRound = await getCurrentRound(sessionId);
  const venuesForRound = await getVenueIdsForRound(sessionId, currentRound);

  if (!venuesForRound.includes(venueId)) {
    throw new Error(`Venue ${venueId} is not in the current round`);
  }

  const matchResult = await checkAndRecordMatch(sessionId, venueId, role, liked);
  const roundComplete = matchResult.matched
    ? false
    : await isRoundComplete(sessionId, currentRound);

  if (!matchResult.matched && roundComplete && currentRound === FINAL_ROUND) {
    const resolution = await resolveNoMatch(sessionId);

    return {
      matched: true,
      matchedVenueId: resolution.venueId,
      roundComplete: true,
      currentRound,
    };
  }

  return {
    matched: matchResult.matched,
    matchedVenueId: matchResult.venueId,
    roundComplete,
    currentRound,
  };
}

export async function getSwipesForRole(
  sessionId: string,
  role: Role,
): Promise<readonly Swipe[]> {
  const swipes = await getSwipeRowsForSession(sessionId);

  return swipes.filter((swipe) => swipe.role === role).map(toSwipe);
}

export async function getRoundCompletion(
  sessionId: string,
  round: number,
): Promise<RoundCompletion> {
  const venueIds = await getVenueIdsForRound(sessionId, round);
  const swipes = await getSwipeRowsForSession(sessionId);
  const roleACount = countDistinctVenueSwipes(swipes, venueIds, "a");
  const roleBCount = countDistinctVenueSwipes(swipes, venueIds, "b");

  return {
    round,
    roleACount,
    roleBCount,
    total: venueIds.length,
    complete: venueIds.length > 0 && roleACount === venueIds.length && roleBCount === venueIds.length,
  };
}

async function getVenueIdsForRound(
  sessionId: string,
  round: number,
): Promise<readonly string[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("venues")
    .select("*")
    .eq("session_id", sessionId);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as VenueRow[])
    .filter((venue) => venue.round === round)
    .map((venue) => venue.id);
}

async function getSwipeRowsForSession(
  sessionId: string,
): Promise<readonly SwipeRow[]> {
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
  role: Role,
): number {
  const roundVenueIds = new Set(venueIds);

  return new Set(
    swipes
      .filter((swipe) => swipe.role === role && roundVenueIds.has(swipe.venue_id))
      .map((swipe) => swipe.venue_id),
  ).size;
}

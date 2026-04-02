import { getSupabaseServerClient } from "../supabase-server";
import type { MatchResult } from "../types/match-result";
import type { SessionRow } from "../types/session";
import { toSession } from "../types/session";
import type { VenueRow } from "../types/venue";
import { toVenue } from "../types/venue";

const NOT_FOUND_CODE = "PGRST116";

function resolveMatchedAt(sessionRow: SessionRow): Date {
  // The current schema does not persist a dedicated match timestamp yet.
  // Use the session creation time as the only available persisted timestamp
  // until DS-05 introduces an explicit matched_at field.
  return new Date(sessionRow.created_at);
}

async function getMatchedSession(sessionId: string): Promise<SessionRow> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("sessions")
    .select()
    .eq("id", sessionId)
    .single<SessionRow>();

  if (error) {
    if (error.code === NOT_FOUND_CODE) {
      throw new Error("Session not found");
    }

    throw new Error(error.message);
  }

  if (data.status !== "matched") {
    throw new Error("Session is not matched");
  }

  if (!data.matched_venue_id) {
    throw new Error("Session does not have a matched venue");
  }

  return data;
}

async function getMatchedVenue(
  sessionId: string,
  venueId: string,
): Promise<VenueRow> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("venues")
    .select()
    .eq("id", venueId)
    .eq("session_id", sessionId)
    .single<VenueRow>();

  if (error) {
    if (error.code === NOT_FOUND_CODE) {
      throw new Error("Matched venue not found");
    }

    throw new Error(error.message);
  }

  return data;
}

export async function getMatchResult(sessionId: string): Promise<MatchResult> {
  const sessionRow = await getMatchedSession(sessionId);
  const session = toSession(sessionRow);
  const matchedVenueId = sessionRow.matched_venue_id;

  if (!matchedVenueId) {
    throw new Error("Session does not have a matched venue");
  }

  const venue = toVenue(
    await getMatchedVenue(sessionId, matchedVenueId),
  );

  return {
    sessionId: session.id,
    venue,
    matchedAt: resolveMatchedAt(sessionRow),
  };
}

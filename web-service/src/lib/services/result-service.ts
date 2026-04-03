import { getSupabaseServerClient } from "../supabase-server";
import type { MatchResult } from "../types/match-result";
import type { SessionRow } from "../types/session";
import type { VenueRow } from "../types/venue";
import { toVenue } from "../types/venue";

const NOT_FOUND_CODE = "PGRST116";
type MatchedSessionRow = SessionRow & { readonly matched_venue_id: string };

function resolveMatchedAt(sessionRow: SessionRow): Date {
  if (!sessionRow.matched_at) {
    throw new Error("Session does not have a matched timestamp");
  }

  return new Date(sessionRow.matched_at);
}

async function getMatchedSession(sessionId: string): Promise<MatchedSessionRow> {
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

  return data as MatchedSessionRow;
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
  const venue = toVenue(await getMatchedVenue(sessionId, sessionRow.matched_venue_id));

  return {
    sessionId,
    venue,
    matchedAt: resolveMatchedAt(sessionRow),
  };
}

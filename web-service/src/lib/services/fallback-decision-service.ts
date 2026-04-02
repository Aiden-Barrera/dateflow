import { getSupabaseServerClient } from "../supabase-server";
import { toSession, type Session, type SessionRow } from "../types/session";
import {
  rerankStoredCandidates,
  type RetryPreferencesInput,
} from "./venue-retry-service";

export async function acceptFallbackSuggestion(
  sessionId: string,
): Promise<Session> {
  const session = await getFallbackPendingSession(sessionId);

  if (!session.matchedVenueId) {
    throw new Error("Fallback suggestion is missing a venue");
  }

  return updateSessionStatus(sessionId, "matched");
}

export async function requestFallbackRetry(
  sessionId: string,
  preferences: RetryPreferencesInput,
): Promise<Session> {
  await getFallbackPendingSession(sessionId);

  await updateSessionStatus(sessionId, "reranking");

  try {
    const result = await rerankStoredCandidates(sessionId, preferences);

    if (result.requiresFullRegeneration) {
      return updateSessionStatus(sessionId, "retry_pending");
    }

    await clearSessionSwipes(sessionId);

    return updateSession(sessionId, {
      status: "ready_to_swipe",
      matched_venue_id: null,
    });
  } catch (error) {
    await updateSessionStatus(sessionId, "fallback_pending");
    throw error;
  }
}

async function getFallbackPendingSession(sessionId: string): Promise<Session> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .single<SessionRow>();

  if (error) {
    throw new Error(error.message);
  }

  const session = toSession(data);

  if (session.status !== "fallback_pending") {
    throw new Error("Session must be in fallback_pending to resolve fallback");
  }

  return session;
}

async function updateSessionStatus(
  sessionId: string,
  status: "matched" | "retry_pending" | "reranking" | "fallback_pending",
): Promise<Session> {
  return updateSession(sessionId, { status });
}

async function clearSessionSwipes(sessionId: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("swipes")
    .delete()
    .eq("session_id", sessionId);

  if (error) {
    throw new Error(error.message);
  }
}

async function updateSession(
  sessionId: string,
  updates: Partial<Pick<SessionRow, "status" | "matched_venue_id">>,
): Promise<Session> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("sessions")
    .update(updates)
    .eq("id", sessionId)
    .select("*")
    .single<SessionRow>();

  if (error) {
    throw new Error(error.message);
  }

  return toSession(data);
}

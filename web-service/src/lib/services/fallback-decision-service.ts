import { getSupabaseServerClient } from "../supabase-server";
import { toSession, type Session, type SessionRow } from "../types/session";
import type { Role } from "../types/preference";
import {
  rerankStoredCandidates,
  type RetryPreferencesInput,
} from "./venue-retry-service";
import { updatePreferenceVibes } from "./preference-service";

const NOT_FOUND_CODE = "PGRST116";

type RetrySessionRow = SessionRow & {
  readonly retry_initiator_role: Role | null;
  readonly retry_a_confirmed_at: string | null;
  readonly retry_b_confirmed_at: string | null;
};

type RetrySession = Session;

export async function acceptFallbackSuggestion(
  sessionId: string,
): Promise<Session> {
  const session = await getFallbackPendingSession(sessionId);

  if (!session.matchedVenueId) {
    throw new Error("Fallback suggestion is missing a venue");
  }

  return updateSession(sessionId, {
    status: "matched",
    matched_at: new Date().toISOString(),
  });
}

export async function requestFallbackRetry(
  sessionId: string,
  role: Role,
  preferences: RetryPreferencesInput,
): Promise<Session> {
  const session = await getFallbackRetrySession(sessionId);
  const confirmedAt = new Date().toISOString();
  const roleConfirmationUpdate = buildRoleConfirmationUpdate(role, confirmedAt);

  await updatePreferenceVibes(sessionId, role, {
    budget: preferences.budget,
    categories: preferences.categories,
  });

  if (shouldWaitForOtherParticipant(session, role)) {
    return updateSession(sessionId, {
      status: "retry_pending",
      retry_initiator_role: session.retryInitiatorRole ?? role,
      ...roleConfirmationUpdate,
    });
  }

  await updateSession(sessionId, {
    status: "reranking",
    retry_initiator_role: session.retryInitiatorRole ?? getOppositeRole(role),
    ...roleConfirmationUpdate,
  });

  try {
    const result = await rerankStoredCandidates(sessionId);

    if (result.requiresFullRegeneration) {
      return updateSession(sessionId, {
        status: "both_ready",
        matched_venue_id: null,
        matched_at: null,
        retry_initiator_role: null,
        retry_a_confirmed_at: null,
        retry_b_confirmed_at: null,
      });
    }

    await clearSessionSwipes(sessionId);

    return updateSession(sessionId, {
      status: "ready_to_swipe",
      matched_venue_id: null,
      matched_at: null,
      retry_initiator_role: null,
      retry_a_confirmed_at: null,
      retry_b_confirmed_at: null,
    });
  } catch (error) {
    await updateSession(sessionId, {
      status: "retry_pending",
      retry_initiator_role: session.retryInitiatorRole ?? getOppositeRole(role),
      ...roleConfirmationUpdate,
    });
    throw error;
  }
}

async function getFallbackPendingSession(sessionId: string): Promise<Session> {
  const session = await getFallbackRetrySession(sessionId);

  if (session.status !== "fallback_pending") {
    throw new Error("Session must be in fallback_pending to resolve fallback");
  }

  return session;
}

async function getFallbackRetrySession(sessionId: string): Promise<RetrySession> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .single<RetrySessionRow>();

  if (error) {
    if (error.code === NOT_FOUND_CODE) {
      throw new Error("Session not found");
    }

    throw new Error(error.message);
  }

  const session = toSession(data);

  if (
    session.status !== "fallback_pending" &&
    session.status !== "retry_pending"
  ) {
    throw new Error(
      "Session must be in fallback_pending or retry_pending to resolve fallback or retry",
    );
  }

  return session;
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
  updates: Partial<
    Pick<
      RetrySessionRow,
      | "status"
      | "matched_venue_id"
      | "matched_at"
      | "retry_initiator_role"
      | "retry_a_confirmed_at"
      | "retry_b_confirmed_at"
    >
  >,
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

function shouldWaitForOtherParticipant(
  session: RetrySession,
  role: Role,
): boolean {
  if (session.status === "fallback_pending") {
    return true;
  }

  const oppositeRole = getOppositeRole(role);
  return getConfirmedAt(session, oppositeRole) === null;
}

function getConfirmedAt(
  session: RetrySession,
  role: Role,
): Date | null {
  return role === "a"
    ? session.retryAConfirmedAt ?? null
    : session.retryBConfirmedAt ?? null;
}

function getOppositeRole(role: Role): Role {
  return role === "a" ? "b" : "a";
}

function buildRoleConfirmationUpdate(role: Role, confirmedAt: string): {
  readonly retry_a_confirmed_at?: string;
  readonly retry_b_confirmed_at?: string;
} {
  return role === "a"
    ? { retry_a_confirmed_at: confirmedAt }
    : { retry_b_confirmed_at: confirmedAt };
}

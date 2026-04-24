/**
 * The session states used across the planning lifecycle.
 *
 * DS-01 introduces:  pending_b, expired
 * DS-02 adds:        both_ready
 * DS-03 adds:        generating, generation_failed
 * DS-04 adds:        ready_to_swipe, fallback_pending, retry_pending,
 *                    reranking, matched
 */
export type SessionStatus =
  | "pending_b"
  | "both_ready"
  | "generating"
  | "generation_failed"
  | "ready_to_swipe"
  | "fallback_pending"
  | "retry_pending"
  | "reranking"
  | "matched"
  | "expired";

/**
 * A planning session between two people.
 *
 * Created when Person A starts the flow (/plan page).
 * Persists until matched, expired, or otherwise reaches a terminal result.
 */
export type Session = {
  readonly id: string;
  readonly status: SessionStatus;
  readonly creatorDisplayName: string;
  readonly inviteeDisplayName: string | null;
  readonly createdAt: Date;
  readonly expiresAt: Date;
  readonly matchedVenueId: string | null;
  readonly matchedAt: Date | null;
  readonly retryInitiatorRole: "a" | "b" | null;
  readonly retryAConfirmedAt: Date | null;
  readonly retryBConfirmedAt: Date | null;
  readonly retryAPreferences: Record<string, unknown> | null;
  readonly retryBPreferences: Record<string, unknown> | null;
};

/**
 * The shareable invite URL for a session.
 *
 * Generated after session creation so Person A can send it to Person B.
 * The URL points to /plan/[sessionId] where Person B enters preferences.
 */
export type ShareLink = {
  readonly sessionId: string;
  readonly url: string;
  readonly expiresAt: Date;
};

// ---------------------------------------------------------------------------
// Database layer — maps Supabase/Postgres snake_case rows to app-level types
// ---------------------------------------------------------------------------

/**
 * The raw row shape returned by Supabase when querying the sessions table.
 * Column names are snake_case (Postgres convention).
 * Dates come back as ISO 8601 strings over the wire.
 */
export type SessionRow = {
  readonly id: string;
  readonly status: SessionStatus;
  readonly creator_display_name: string;
  readonly invitee_display_name: string | null;
  readonly created_at: string;
  readonly expires_at: string;
  readonly matched_venue_id: string | null;
  readonly matched_at: string | null;
  readonly retry_initiator_role?: "a" | "b" | null;
  readonly retry_a_confirmed_at?: string | null;
  readonly retry_b_confirmed_at?: string | null;
  readonly retry_a_preferences?: Record<string, unknown> | null;
  readonly retry_b_preferences?: Record<string, unknown> | null;
};

/**
 * Converts a raw Supabase row into an app-level Session.
 *
 * This is the single conversion point — every DB query result passes through
 * here exactly once, so field mapping and date parsing happen in one place.
 */
export function toSession(row: SessionRow): Session {
  return {
    id: row.id,
    status: row.status,
    creatorDisplayName: row.creator_display_name,
    inviteeDisplayName: row.invitee_display_name,
    createdAt: new Date(row.created_at),
    expiresAt: new Date(row.expires_at),
    matchedVenueId: row.matched_venue_id,
    matchedAt: row.matched_at ? new Date(row.matched_at) : null,
    retryInitiatorRole: row.retry_initiator_role ?? null,
    retryAConfirmedAt: row.retry_a_confirmed_at
      ? new Date(row.retry_a_confirmed_at)
      : null,
    retryBConfirmedAt: row.retry_b_confirmed_at
      ? new Date(row.retry_b_confirmed_at)
      : null,
    retryAPreferences: row.retry_a_preferences ?? null,
    retryBPreferences: row.retry_b_preferences ?? null,
  };
}

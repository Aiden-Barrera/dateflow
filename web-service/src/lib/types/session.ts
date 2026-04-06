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
  };
}

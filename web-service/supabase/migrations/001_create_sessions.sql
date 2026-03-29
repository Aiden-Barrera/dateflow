-- 001_create_sessions.sql
-- DS-01: Session Management — creates the core sessions table.
--
-- This is the first table in the system. Every other feature (preferences,
-- venue generation, swiping) hangs off a session ID.

CREATE TABLE sessions (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  status               text        NOT NULL DEFAULT 'pending_b'
                                   CHECK (status IN (
                                     'pending_b',
                                     'both_ready',
                                     'generating',
                                     'generation_failed',
                                     'ready_to_swipe',
                                     'matched',
                                     'expired'
                                   )),
  creator_display_name text        NOT NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  expires_at           timestamptz NOT NULL DEFAULT now() + interval '48 hours',
  matched_venue_id     text
);

-- Partial index: only indexes sessions that are still "in play" (not matched
-- or expired). This keeps the index small and fast — finished sessions are
-- the majority over time but are never queried by the active-session paths.
--
-- Used by: SessionService.expireStaleSessions() to find sessions past their
-- expiry, and validateSessionForJoin() to check if a session is joinable.
CREATE INDEX idx_sessions_status_expires
  ON sessions (status, expires_at)
  WHERE status NOT IN ('matched', 'expired');

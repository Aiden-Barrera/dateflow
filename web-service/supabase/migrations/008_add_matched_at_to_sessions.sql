-- 008_add_matched_at_to_sessions.sql
-- Persist the actual time a session became matched instead of inferring it
-- from sessions.created_at.

ALTER TABLE sessions
ADD COLUMN matched_at timestamptz;

-- Backfill existing matched sessions with the only durable timestamp we have.
UPDATE sessions
SET matched_at = created_at
WHERE status = 'matched'
  AND matched_venue_id IS NOT NULL
  AND matched_at IS NULL;

-- Ensure any session that is still open for swiping does not carry a stale
-- matched timestamp.
UPDATE sessions
SET matched_at = null
WHERE status = 'ready_to_swipe'
  AND matched_at IS NOT NULL;

DROP FUNCTION IF EXISTS record_swipe_and_check_match(uuid, uuid, text, boolean);

CREATE OR REPLACE FUNCTION record_swipe_and_check_match(
  input_session_id uuid,
  input_venue_id uuid,
  input_role text,
  input_liked boolean
)
RETURNS TABLE (matched boolean, matched_venue_id uuid)
LANGUAGE plpgsql
AS $$
DECLARE
  other_role text;
  other_liked boolean;
  current_status text;
  current_session_matched_venue_id text;
BEGIN
  IF input_role NOT IN ('a', 'b') THEN
    RAISE EXCEPTION 'invalid role: %', input_role;
  END IF;

  other_role := CASE input_role WHEN 'a' THEN 'b' ELSE 'a' END;

  SELECT sessions.status, sessions.matched_venue_id
    INTO current_status, current_session_matched_venue_id
  FROM sessions
  WHERE sessions.id = input_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'session not found: %', input_session_id;
  END IF;

  IF current_status <> 'ready_to_swipe' THEN
    RAISE EXCEPTION 'cannot swipe when session status is %', current_status;
  END IF;

  PERFORM 1
  FROM venues
  WHERE id = input_venue_id
    AND session_id = input_session_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'venue % does not belong to session %', input_venue_id, input_session_id;
  END IF;

  INSERT INTO swipes (session_id, venue_id, role, liked)
  VALUES (input_session_id, input_venue_id, input_role, input_liked)
  ON CONFLICT (session_id, venue_id, role)
  DO UPDATE
    SET liked = EXCLUDED.liked;

  IF input_liked THEN
    SELECT swipes.liked
      INTO other_liked
    FROM swipes
    WHERE swipes.session_id = input_session_id
      AND swipes.venue_id = input_venue_id
      AND swipes.role = other_role
    FOR UPDATE;

    IF COALESCE(other_liked, false) THEN
      UPDATE sessions
      SET status = 'matched',
          matched_venue_id = input_venue_id,
          matched_at = clock_timestamp()
      WHERE sessions.id = input_session_id
        AND status = 'ready_to_swipe';

      SELECT sessions.status, sessions.matched_venue_id
        INTO current_status, current_session_matched_venue_id
      FROM sessions
      WHERE sessions.id = input_session_id;
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    (current_status = 'matched' AND current_session_matched_venue_id = input_venue_id::text) AS matched,
    CASE
      WHEN current_status = 'matched' AND current_session_matched_venue_id = input_venue_id::text
        THEN input_venue_id
      ELSE NULL::uuid
    END AS matched_venue_id;
END;
$$;

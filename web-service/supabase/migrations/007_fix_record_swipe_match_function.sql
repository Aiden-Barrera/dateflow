-- 007_fix_record_swipe_match_function.sql
-- Qualify the RPC return alias so Postgres does not confuse the
-- returned venue_id column with swipes.venue_id inside RETURN QUERY.

CREATE OR REPLACE FUNCTION record_swipe_and_check_match(
  input_session_id uuid,
  input_venue_id uuid,
  input_role text,
  input_liked boolean
)
RETURNS TABLE (matched boolean, venue_id uuid)
LANGUAGE plpgsql
AS $$
DECLARE
  other_role text;
  other_liked boolean;
  current_status text;
  current_matched_venue_id text;
BEGIN
  IF input_role NOT IN ('a', 'b') THEN
    RAISE EXCEPTION 'invalid role: %', input_role;
  END IF;

  other_role := CASE input_role WHEN 'a' THEN 'b' ELSE 'a' END;

  SELECT status, matched_venue_id
    INTO current_status, current_matched_venue_id
  FROM sessions
  WHERE id = input_session_id
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
          matched_venue_id = input_venue_id
      WHERE id = input_session_id
        AND status = 'ready_to_swipe';

      SELECT status, matched_venue_id
        INTO current_status, current_matched_venue_id
      FROM sessions
      WHERE id = input_session_id;
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    (current_status = 'matched' AND current_matched_venue_id = input_venue_id::text) AS matched,
    CASE
      WHEN current_status = 'matched' AND current_matched_venue_id = input_venue_id::text
        THEN input_venue_id
      ELSE NULL::uuid
    END AS matched_venue_id;
END;
$$;

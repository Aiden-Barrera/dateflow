-- 004_create_swipes.sql
-- DS-04: Swipe & Match — stores per-role swipe decisions and provides
-- an atomic RPC to record a swipe and detect a mutual match.

CREATE TABLE swipes (
  id                           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id                   uuid        NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  venue_id                     uuid        NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  role                         text        NOT NULL CHECK (role IN ('a', 'b')),
  liked                        boolean     NOT NULL,
  created_at                   timestamptz NOT NULL DEFAULT now(),

  UNIQUE (session_id, venue_id, role)
);

CREATE INDEX idx_swipes_session_role
  ON swipes (session_id, role);

CREATE INDEX idx_swipes_session_venue
  ON swipes (session_id, venue_id);

ALTER TABLE swipes ENABLE ROW LEVEL SECURITY;

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
  current_matched_venue_id uuid;
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

  INSERT INTO swipes (session_id, venue_id, role, liked)
  VALUES (input_session_id, input_venue_id, input_role, input_liked)
  ON CONFLICT (session_id, venue_id, role)
  DO UPDATE
    SET liked = EXCLUDED.liked,
        created_at = now();

  IF input_liked THEN
    SELECT liked
      INTO other_liked
    FROM swipes
    WHERE session_id = input_session_id
      AND venue_id = input_venue_id
      AND role = other_role
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
    (current_status = 'matched' AND current_matched_venue_id = input_venue_id) AS matched,
    CASE
      WHEN current_status = 'matched' AND current_matched_venue_id = input_venue_id
        THEN input_venue_id
      ELSE NULL
    END AS venue_id;
END;
$$;

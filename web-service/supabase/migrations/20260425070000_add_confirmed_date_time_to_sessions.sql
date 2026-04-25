-- DS-07D: Add confirmed_date_time to sessions.
-- Written when both users agree on a meeting time for a static venue match.
-- NULL until confirmed; live events use venue.scheduled_at instead.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'confirmed_date_time'
  ) THEN
    ALTER TABLE sessions
      ADD COLUMN confirmed_date_time TIMESTAMPTZ;
  END IF;
END
$$;

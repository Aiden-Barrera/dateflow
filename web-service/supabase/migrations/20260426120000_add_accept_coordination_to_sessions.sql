-- DS-04 fallback dual-confirm: track when each user has clicked "Lock in this
-- plan" so both people must confirm before the session transitions to matched.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'accept_a_confirmed_at'
  ) THEN
    ALTER TABLE sessions
      ADD COLUMN accept_a_confirmed_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'accept_b_confirmed_at'
  ) THEN
    ALTER TABLE sessions
      ADD COLUMN accept_b_confirmed_at TIMESTAMPTZ;
  END IF;
END
$$;

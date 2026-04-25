-- DS-07B: Add CHECK constraints for source_type and age_restriction on venues.
-- Enforces the app-layer union at the DB level so invalid values can never be stored.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'venues_source_type_check'
  ) THEN
    ALTER TABLE venues
      ADD CONSTRAINT venues_source_type_check
      CHECK (source_type IN ('places', 'ticketmaster'));
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'venues_age_restriction_check'
  ) THEN
    ALTER TABLE venues
      ADD CONSTRAINT venues_age_restriction_check
      CHECK (
        age_restriction IS NULL
        OR age_restriction IN ('18+', '21+')
      );
  END IF;
END
$$;

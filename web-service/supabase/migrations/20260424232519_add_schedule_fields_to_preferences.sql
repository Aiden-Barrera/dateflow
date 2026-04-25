-- DS-07A: Schedule preference fields
-- Adds three optional columns used by the Meetup/Ticketmaster event query
-- pipeline (DS-07B). All nullable so existing preference rows are unaffected.

ALTER TABLE preferences
  ADD COLUMN IF NOT EXISTS schedule_window TEXT,
  ADD COLUMN IF NOT EXISTS available_days  TEXT[],
  ADD COLUMN IF NOT EXISTS time_of_day     TEXT;

-- Allowed values are enforced at the application layer (preference-service /
-- API route) rather than as CHECK constraints, keeping the schema flexible
-- for future additions without requiring another migration.

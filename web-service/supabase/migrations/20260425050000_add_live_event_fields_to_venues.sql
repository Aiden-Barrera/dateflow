-- DS-07B: Live event fields on venues
-- Adds source tracking and event-specific metadata so Meetup/Ticketmaster
-- candidates can be stored alongside Google Places venues.

ALTER TABLE venues
  ADD COLUMN IF NOT EXISTS source_type      TEXT NOT NULL DEFAULT 'places',
  ADD COLUMN IF NOT EXISTS scheduled_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS event_url        TEXT,
  ADD COLUMN IF NOT EXISTS duration_minutes INT,
  ADD COLUMN IF NOT EXISTS age_restriction  TEXT; -- '18+' | '21+' | null

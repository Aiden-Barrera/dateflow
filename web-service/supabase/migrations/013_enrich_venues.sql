-- 013_enrich_venues.sql
-- DS-03: Enrich venues with editorial summary, review count, opening hours,
-- distance from midpoint, website, and AI "why picked" reasoning.
--
-- All columns are nullable — venues predating this migration (or Google
-- responses that omit these fields) remain valid.

ALTER TABLE venues
  ADD COLUMN IF NOT EXISTS editorial_summary text,
  ADD COLUMN IF NOT EXISTS user_rating_count integer
    CHECK (user_rating_count IS NULL OR user_rating_count >= 0),
  ADD COLUMN IF NOT EXISTS opening_hours jsonb,
  ADD COLUMN IF NOT EXISTS distance_meters double precision
    CHECK (distance_meters IS NULL OR distance_meters >= 0),
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS why_picked text
    CHECK (why_picked IS NULL OR char_length(why_picked) <= 140);

-- DS-XX: Sponsored venue infrastructure
--
-- Two additions:
--
-- 1. sponsored_venues — lets venue operators pay to appear with higher
--    probability in date recommendations. Rows are inserted by an admin
--    or future self-serve portal. The scorer reads active rows at
--    generation time and applies `boost` (0–1) to the venue's composite
--    ranking score.
--
-- 2. venues.popularity_boost — a pre-computed 0–1 signal derived from
--    cross-session like rates for the same place_id. Populated by a
--    future nightly job (or materialised view refresh) so the scorer
--    doesn't need to aggregate swipes at generation time.

-- ─── Sponsored venues ──────────────────────────────────────────────────────

CREATE TABLE sponsored_venues (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id        text        NOT NULL,
  boost           double precision NOT NULL DEFAULT 0.15
                              CHECK (boost BETWEEN 0 AND 1),
  active          boolean     NOT NULL DEFAULT true,
  campaign_name   text,
  campaign_start  timestamptz,
  campaign_end    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Fast lookup by place_id during venue scoring.
-- UNIQUE enforces the runtime assumption that each place_id has at most one
-- active sponsored boost at a time, so active-row lookups are deterministic.
CREATE UNIQUE INDEX idx_sponsored_venues_place_id_active
  ON sponsored_venues (place_id)
  WHERE active = true;

-- RLS: service-role key bypasses; direct client access blocked
ALTER TABLE sponsored_venues ENABLE ROW LEVEL SECURITY;

-- ─── Popularity signal on venues ────────────────────────────────────────────

ALTER TABLE venues
  ADD COLUMN IF NOT EXISTS popularity_boost double precision NOT NULL DEFAULT 0.0
    CHECK (popularity_boost BETWEEN 0 AND 1);

COMMENT ON COLUMN venues.popularity_boost IS
  'Pre-computed cross-session like-rate signal for this place_id (0–1). '
  'Updated by a nightly analytics job. Boosts venues that have historically '
  'received mutual likes across multiple sessions.';

-- ─── Convenience view: global venue like-rates ─────────────────────────────
-- Aggregates swipe data across all sessions to show how often each place_id
-- is liked when shown. Used by the analytics job to refresh popularity_boost.

-- Group only by place_id so that the same physical venue is always
-- one row regardless of session-scoped name/category variations.
-- MIN() picks a representative name/category for display purposes.
CREATE OR REPLACE VIEW venue_global_like_rates AS
SELECT
  v.place_id,
  MIN(v.name)                                           AS name,
  MIN(v.category)                                       AS category,
  COUNT(*)                                              AS total_swipes,
  COUNT(*) FILTER (WHERE s.liked = true)                AS total_likes,
  ROUND(
    COUNT(*) FILTER (WHERE s.liked = true)::numeric /
    NULLIF(COUNT(*), 0),
    4
  )                                                     AS like_rate
FROM swipes s
JOIN venues v ON s.venue_id = v.id
GROUP BY v.place_id;

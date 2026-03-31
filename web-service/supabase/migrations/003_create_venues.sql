-- 003_create_venues.sql
-- DS-03: Venue Generation — stores venues generated for each session.
--
-- A session has up to 12 venues across 3 rounds (4 per round). Each venue is
-- scored across 5 independent dimensions (categoryOverlap, distanceToMidpoint,
-- firstDateSuitability, qualitySignal, timeOfDayFit), plus a composite score.
--
-- Scores are stored as individual columns (not JSONB) for efficient range queries
-- and sorting (e.g., "venues with quality_signal > 0.7").

CREATE TABLE venues (
  id                           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id                   uuid        NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  place_id                     text        NOT NULL,
  name                         text        NOT NULL,
  category                     text        NOT NULL CHECK (category IN ('RESTAURANT', 'BAR', 'ACTIVITY', 'EVENT')),
  address                      text        NOT NULL,
  lat                          double precision NOT NULL,
  lng                          double precision NOT NULL,
  price_level                  int         NOT NULL CHECK (price_level BETWEEN 1 AND 4),
  rating                       double precision NOT NULL CHECK (rating BETWEEN 0 AND 5),
  photo_url                    text,
  tags                         text[]      NOT NULL DEFAULT '{}',
  round                        int         NOT NULL CHECK (round BETWEEN 1 AND 3),
  position                     int         NOT NULL CHECK (position BETWEEN 1 AND 4),
  score_category_overlap       double precision NOT NULL CHECK (score_category_overlap BETWEEN 0 AND 1),
  score_distance_to_midpoint   double precision NOT NULL CHECK (score_distance_to_midpoint BETWEEN 0 AND 1),
  score_first_date_suitability double precision NOT NULL CHECK (score_first_date_suitability BETWEEN 0 AND 1),
  score_quality_signal         double precision NOT NULL CHECK (score_quality_signal BETWEEN 0 AND 1),
  score_time_of_day_fit        double precision NOT NULL CHECK (score_time_of_day_fit BETWEEN 0 AND 1),

  -- Unique constraint: at most one row per (session_id, round, position) slot.
  -- Ensures that each (round, position) within a session is occupied by at most
  -- one venue; it does not prevent the same place_id from appearing in multiple slots.
  UNIQUE (session_id, round, position)
);

-- Index for efficiently retrieving all venues for a session across rounds.
-- Used by: VenueGenerationService.getVenuesForRound(), swipe UI to load rounds.
CREATE INDEX idx_venues_session_round
  ON venues (session_id, round);

-- Index for score-based queries (e.g., "get top venues by composite score").
-- Composite score is (categoryOverlap + distanceToMidpoint + firstDateSuitability
-- + qualitySignal + timeOfDayFit) / 5. Venues are sorted by this in the UI.
CREATE INDEX idx_venues_composite_score
  ON venues (
    session_id,
    (
      (score_category_overlap + score_distance_to_midpoint + score_first_date_suitability
       + score_quality_signal + score_time_of_day_fit) / 5
    ) DESC
  );

-- 005_create_candidate_pools.sql
-- DS-03A: Candidate Pool Persistence — stores reusable venue candidates and
-- the surfaced generation batches built from them.

CREATE TABLE session_candidate_pools (
  id                           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id                   uuid        NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  source                       text        NOT NULL CHECK (source IN ('initial_generation', 'full_regeneration')),
  created_at                   timestamptz NOT NULL DEFAULT now(),

  UNIQUE (session_id, source)
);

CREATE TABLE session_candidate_pool_items (
  id                           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id                      uuid        NOT NULL REFERENCES session_candidate_pools(id) ON DELETE CASCADE,
  place_id                     text        NOT NULL,
  name                         text        NOT NULL,
  category                     text        NOT NULL CHECK (category IN ('RESTAURANT', 'BAR', 'ACTIVITY', 'EVENT')),
  address                      text        NOT NULL,
  lat                          double precision NOT NULL,
  lng                          double precision NOT NULL,
  price_level                  int         NOT NULL CHECK (price_level BETWEEN 1 AND 4),
  rating                       double precision NOT NULL CHECK (rating BETWEEN 0 AND 5),
  photo_url                    text,
  raw_types                    text[]      NOT NULL DEFAULT '{}',
  raw_tags                     text[]      NOT NULL DEFAULT '{}',
  source_rank                  int         NOT NULL CHECK (source_rank >= 1),
  created_at                   timestamptz NOT NULL DEFAULT now(),

  UNIQUE (pool_id, place_id)
);

CREATE TABLE venue_generation_batches (
  id                           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id                   uuid        NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  pool_id                      uuid        NOT NULL REFERENCES session_candidate_pools(id) ON DELETE CASCADE,
  batch_number                 int         NOT NULL CHECK (batch_number >= 1),
  generation_strategy          text        NOT NULL CHECK (
    generation_strategy IN ('initial_pool_rank', 'pool_rerank', 'full_regeneration')
  ),
  created_at                   timestamptz NOT NULL DEFAULT now(),

  UNIQUE (session_id, batch_number)
);

ALTER TABLE venues ADD COLUMN generation_batch_id uuid REFERENCES venue_generation_batches(id);
ALTER TABLE venues ADD COLUMN surfaced_cycle int NOT NULL DEFAULT 1;

CREATE INDEX idx_candidate_pool_items_pool_rank
  ON session_candidate_pool_items (pool_id, source_rank);

CREATE INDEX idx_generation_batches_session
  ON venue_generation_batches (session_id, batch_number);

ALTER TABLE session_candidate_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_candidate_pool_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_generation_batches ENABLE ROW LEVEL SECURITY;

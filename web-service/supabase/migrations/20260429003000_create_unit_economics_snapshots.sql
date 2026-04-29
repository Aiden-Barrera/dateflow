-- DS-07: per-session unit economics snapshots for prototype cost tracking.
-- Tracks estimated request-driven costs so prototype sessions can be reviewed
-- without reconstructing usage from logs after the fact.

CREATE TABLE unit_economics_snapshots (
  session_id                  uuid PRIMARY KEY
                              REFERENCES sessions(id) ON DELETE CASCADE,
  places_search_requests      integer NOT NULL DEFAULT 0
                              CHECK (places_search_requests >= 0),
  places_photo_requests       integer NOT NULL DEFAULT 0
                              CHECK (places_photo_requests >= 0),
  ai_requests                 integer NOT NULL DEFAULT 0
                              CHECK (ai_requests >= 0),
  ai_input_tokens             integer NOT NULL DEFAULT 0
                              CHECK (ai_input_tokens >= 0),
  ai_output_tokens            integer NOT NULL DEFAULT 0
                              CHECK (ai_output_tokens >= 0),
  places_search_cost_cents    integer NOT NULL DEFAULT 0
                              CHECK (places_search_cost_cents >= 0),
  places_photo_cost_cents     integer NOT NULL DEFAULT 0
                              CHECK (places_photo_cost_cents >= 0),
  ai_cost_cents               integer NOT NULL DEFAULT 0
                              CHECK (ai_cost_cents >= 0),
  infra_cost_cents            integer NOT NULL DEFAULT 0
                              CHECK (infra_cost_cents >= 0),
  acquisition_cost_cents      integer
                              CHECK (acquisition_cost_cents IS NULL OR acquisition_cost_cents >= 0),
  revenue_cents               integer NOT NULL DEFAULT 0
                              CHECK (revenue_cents >= 0),
  gross_margin_cents          integer NOT NULL DEFAULT 0,
  last_computed_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_unit_economics_snapshots_last_computed_at
  ON unit_economics_snapshots (last_computed_at DESC);

ALTER TABLE unit_economics_snapshots ENABLE ROW LEVEL SECURITY;

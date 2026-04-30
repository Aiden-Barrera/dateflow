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

CREATE OR REPLACE FUNCTION increment_unit_economics_snapshot(
  input_session_id uuid,
  input_places_search_requests integer,
  input_places_photo_requests integer,
  input_ai_requests integer,
  input_ai_input_tokens integer,
  input_ai_output_tokens integer,
  input_places_search_cost_cents integer,
  input_places_photo_cost_cents integer,
  input_ai_cost_cents integer,
  input_infra_cost_cents integer
)
RETURNS SETOF unit_economics_snapshots
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  INSERT INTO unit_economics_snapshots (
    session_id,
    places_search_requests,
    places_photo_requests,
    ai_requests,
    ai_input_tokens,
    ai_output_tokens,
    places_search_cost_cents,
    places_photo_cost_cents,
    ai_cost_cents,
    infra_cost_cents,
    gross_margin_cents,
    last_computed_at
  )
  VALUES (
    input_session_id,
    input_places_search_requests,
    input_places_photo_requests,
    input_ai_requests,
    input_ai_input_tokens,
    input_ai_output_tokens,
    input_places_search_requests * input_places_search_cost_cents,
    input_places_photo_requests * input_places_photo_cost_cents,
    input_ai_requests * input_ai_cost_cents,
    CASE
      WHEN input_places_search_requests > 0
        OR input_places_photo_requests > 0
        OR input_ai_requests > 0
      THEN input_infra_cost_cents
      ELSE 0
    END,
    -(
      (input_places_search_requests * input_places_search_cost_cents) +
      (input_places_photo_requests * input_places_photo_cost_cents) +
      (input_ai_requests * input_ai_cost_cents) +
      CASE
        WHEN input_places_search_requests > 0
          OR input_places_photo_requests > 0
          OR input_ai_requests > 0
        THEN input_infra_cost_cents
        ELSE 0
      END
    ),
    now()
  )
  ON CONFLICT (session_id) DO UPDATE
  SET
    places_search_requests = unit_economics_snapshots.places_search_requests + input_places_search_requests,
    places_photo_requests = unit_economics_snapshots.places_photo_requests + input_places_photo_requests,
    ai_requests = unit_economics_snapshots.ai_requests + input_ai_requests,
    ai_input_tokens = unit_economics_snapshots.ai_input_tokens + input_ai_input_tokens,
    ai_output_tokens = unit_economics_snapshots.ai_output_tokens + input_ai_output_tokens,
    places_search_cost_cents =
      (unit_economics_snapshots.places_search_requests + input_places_search_requests) *
      input_places_search_cost_cents,
    places_photo_cost_cents =
      (unit_economics_snapshots.places_photo_requests + input_places_photo_requests) *
      input_places_photo_cost_cents,
    ai_cost_cents =
      (unit_economics_snapshots.ai_requests + input_ai_requests) *
      input_ai_cost_cents,
    infra_cost_cents = CASE
      WHEN (
        unit_economics_snapshots.places_search_requests + input_places_search_requests
      ) > 0
        OR (
          unit_economics_snapshots.places_photo_requests + input_places_photo_requests
        ) > 0
        OR (
          unit_economics_snapshots.ai_requests + input_ai_requests
        ) > 0
      THEN GREATEST(unit_economics_snapshots.infra_cost_cents, input_infra_cost_cents)
      ELSE unit_economics_snapshots.infra_cost_cents
    END,
    gross_margin_cents =
      unit_economics_snapshots.revenue_cents -
      (
        ((unit_economics_snapshots.places_search_requests + input_places_search_requests) *
          input_places_search_cost_cents) +
        ((unit_economics_snapshots.places_photo_requests + input_places_photo_requests) *
          input_places_photo_cost_cents) +
        ((unit_economics_snapshots.ai_requests + input_ai_requests) *
          input_ai_cost_cents) +
        CASE
          WHEN (
            unit_economics_snapshots.places_search_requests + input_places_search_requests
          ) > 0
            OR (
              unit_economics_snapshots.places_photo_requests + input_places_photo_requests
            ) > 0
            OR (
              unit_economics_snapshots.ai_requests + input_ai_requests
            ) > 0
          THEN GREATEST(unit_economics_snapshots.infra_cost_cents, input_infra_cost_cents)
          ELSE unit_economics_snapshots.infra_cost_cents
        END +
        COALESCE(unit_economics_snapshots.acquisition_cost_cents, 0)
      ),
    last_computed_at = now()
  RETURNING *;
END;
$$;

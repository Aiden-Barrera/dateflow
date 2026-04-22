-- 20260402233103_create_preferences.sql
-- DS-02: Preference Input — stores each person's date preferences.
--
-- Each session has exactly two preference rows: one for role 'a' (Person A)
-- and one for role 'b' (Person B). The UNIQUE constraint enforces this.

CREATE TABLE preferences (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid        NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  role        text        NOT NULL CHECK (role IN ('a', 'b')),
  location    jsonb       NOT NULL,
  budget      text        NOT NULL CHECK (budget IN ('BUDGET', 'MODERATE', 'UPSCALE')),
  categories  text[]      NOT NULL CHECK (cardinality(categories) > 0),
  created_at  timestamptz NOT NULL DEFAULT now(),

  -- One preference per person per session. If Person A already submitted,
  -- a second insert with role='a' for the same session will fail with a
  -- unique violation — not silently overwrite.
  UNIQUE (session_id, role)
);

-- Enable RLS on preferences. The service role key bypasses this, so
-- API routes work fine while direct anon access is blocked.
ALTER TABLE preferences ENABLE ROW LEVEL SECURITY;

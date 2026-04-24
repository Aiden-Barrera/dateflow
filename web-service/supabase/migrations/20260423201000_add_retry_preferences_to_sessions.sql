-- 20260423201000_add_retry_preferences_to_sessions.sql
-- Persist each side's retry preferences so fallback reranking waits for both
-- confirmations and can merge their updated inputs.

ALTER TABLE sessions
  ADD COLUMN retry_a_preferences jsonb,
  ADD COLUMN retry_b_preferences jsonb;

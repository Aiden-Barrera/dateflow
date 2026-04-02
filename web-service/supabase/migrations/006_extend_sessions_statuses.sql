-- 006_extend_sessions_statuses.sql
-- DS-04 no-match fallback and retry flow needs intermediate session states.

ALTER TABLE sessions
  DROP CONSTRAINT IF EXISTS sessions_status_check;

ALTER TABLE sessions
  ADD CONSTRAINT sessions_status_check
  CHECK (status IN (
    'pending_b',
    'both_ready',
    'generating',
    'generation_failed',
    'ready_to_swipe',
    'fallback_pending',
    'retry_pending',
    'reranking',
    'matched',
    'expired'
  ));

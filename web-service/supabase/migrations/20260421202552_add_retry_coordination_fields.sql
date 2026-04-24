-- 20260421202552_add_retry_coordination_fields.sql
-- Adds durable session-level coordination fields for fallback retry flow.

ALTER TABLE sessions
  ADD COLUMN retry_initiator_role text CHECK (retry_initiator_role IN ('a', 'b')),
  ADD COLUMN retry_a_confirmed_at timestamptz,
  ADD COLUMN retry_b_confirmed_at timestamptz;

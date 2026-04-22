-- DS-06 follow-up: secure account-linked history tables and preserve one
-- account per session role.

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

ALTER TABLE session_accounts ENABLE ROW LEVEL SECURITY;

ALTER TABLE session_accounts
  ADD CONSTRAINT session_accounts_session_id_role_key
  UNIQUE (session_id, role);
-- 20260414154220_secure_accounts_and_session_accounts.sql

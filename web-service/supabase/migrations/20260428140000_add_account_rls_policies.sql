-- DS-06: account-scoped RLS policies for optional session history.
-- Server-side service-role routes still perform privileged writes, but these
-- policies provide defense-in-depth for direct authenticated Supabase access.

CREATE POLICY accounts_select_own
  ON accounts
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY accounts_delete_own
  ON accounts
  FOR DELETE
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY session_accounts_select_own
  ON session_accounts
  FOR SELECT
  TO authenticated
  USING (account_id = auth.uid());

CREATE POLICY session_accounts_delete_own
  ON session_accounts
  FOR DELETE
  TO authenticated
  USING (account_id = auth.uid());

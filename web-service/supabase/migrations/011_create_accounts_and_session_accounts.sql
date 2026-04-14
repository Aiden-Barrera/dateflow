-- DS-06: Session History — adds lightweight accounts plus a join table that
-- links sessions to accounts without changing the accountless MVP session flow.

CREATE TABLE accounts (
  id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE session_accounts (
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('a', 'b')),
  linked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, account_id)
);

CREATE INDEX idx_session_accounts_account
  ON session_accounts (account_id);

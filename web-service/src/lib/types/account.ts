export type Account = {
  readonly id: string;
  readonly email: string;
  readonly createdAt: Date;
};

export type AccountRow = {
  readonly id: string;
  readonly email: string;
  readonly created_at: string;
};

export function toAccount(row: AccountRow): Account {
  return {
    id: row.id,
    email: row.email,
    createdAt: new Date(row.created_at),
  };
}

export type SessionAccountRole = "a" | "b";

export type SessionAccount = {
  readonly sessionId: string;
  readonly accountId: string;
  readonly role: SessionAccountRole;
  readonly linkedAt: Date;
};

export type SessionAccountRow = {
  readonly session_id: string;
  readonly account_id: string;
  readonly role: SessionAccountRole;
  readonly linked_at: string;
};

export function toSessionAccount(row: SessionAccountRow): SessionAccount {
  return {
    sessionId: row.session_id,
    accountId: row.account_id,
    role: row.role,
    linkedAt: new Date(row.linked_at),
  };
}

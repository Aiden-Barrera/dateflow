import { describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";

const currentFile = fileURLToPath(import.meta.url);
const currentDir = dirname(currentFile);

const migrationPath = join(
  currentDir,
  "..",
  "..",
  "..",
  "supabase",
  "migrations",
  "20260413235224_create_accounts_and_session_accounts.sql",
);

function readMigration(): string {
  return readFileSync(migrationPath, "utf8");
}

describe("20260413235224_create_accounts_and_session_accounts.sql", () => {
  it("creates the accounts table keyed by Supabase auth user id", () => {
    const migration = readMigration();

    expect(migration).toContain("CREATE TABLE accounts");
    expect(migration).toContain("id uuid PRIMARY KEY");
    expect(migration).toContain("email text NOT NULL UNIQUE");
    expect(migration).toContain("created_at timestamptz NOT NULL DEFAULT now()");
  });

  it("creates the session_accounts join table with role and cascades", () => {
    const migration = readMigration();

    expect(migration).toContain("CREATE TABLE session_accounts");
    expect(migration).toContain(
      "session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE",
    );
    expect(migration).toContain(
      "account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE",
    );
    expect(migration).toContain("role text NOT NULL CHECK (role IN ('a', 'b'))");
    expect(migration).toContain("PRIMARY KEY (session_id, account_id)");
  });

  it("indexes session history lookups by account", () => {
    const migration = readMigration();

    expect(migration).toContain("CREATE INDEX idx_session_accounts_account");
    expect(migration).toContain("ON session_accounts (account_id)");
  });
});

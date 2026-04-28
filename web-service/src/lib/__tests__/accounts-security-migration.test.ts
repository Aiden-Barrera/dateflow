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
  "20260414154220_secure_accounts_and_session_accounts.sql",
);
const rlsPoliciesMigrationPath = join(
  currentDir,
  "..",
  "..",
  "..",
  "supabase",
  "migrations",
  "20260428140000_add_account_rls_policies.sql",
);

function readMigration(): string {
  return readFileSync(migrationPath, "utf8");
}

describe("20260414154220_secure_accounts_and_session_accounts.sql", () => {
  it("enables RLS on account history tables", () => {
    const migration = readMigration();

    expect(migration).toContain("ALTER TABLE accounts ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain(
      "ALTER TABLE session_accounts ENABLE ROW LEVEL SECURITY",
    );
  });

  it("prevents multiple accounts from claiming the same session role", () => {
    const migration = readMigration();

    expect(migration).toContain(
      "ADD CONSTRAINT session_accounts_session_id_role_key",
    );
    expect(migration).toContain("UNIQUE (session_id, role)");
  });
});

describe("20260428140000_add_account_rls_policies.sql", () => {
  it("adds account-scoped RLS policies for account history tables", () => {
    const migration = readFileSync(rlsPoliciesMigrationPath, "utf8");

    expect(migration).toContain("CREATE POLICY accounts_select_own");
    expect(migration).toContain("CREATE POLICY accounts_delete_own");
    expect(migration).toContain("CREATE POLICY session_accounts_select_own");
    expect(migration).toContain("CREATE POLICY session_accounts_delete_own");
    expect(migration).toContain("auth.uid()");
  });
});

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migrationPath = join(
  process.cwd(),
  "supabase",
  "migrations",
  "004_create_swipes.sql",
);

function readMigration(): string {
  return readFileSync(migrationPath, "utf8");
}

describe("004_create_swipes.sql", () => {
  it("creates the swipes table with DS-04 required columns", () => {
    const migration = readMigration();

    expect(migration).toContain("CREATE TABLE swipes");
    expect(migration).toContain("session_id                   uuid");
    expect(migration).toContain("venue_id                     uuid");
    expect(migration).toContain("role                         text");
    expect(migration).toContain("liked                        boolean");
    expect(migration).toContain("created_at                   timestamptz");
  });

  it("enforces idempotent swipes per session, venue, and role", () => {
    const migration = readMigration();

    expect(migration).toContain("UNIQUE (session_id, venue_id, role)");
    expect(migration).toContain("ON CONFLICT (session_id, venue_id, role)");
    expect(migration).toContain("DO UPDATE");
  });

  it("defines the atomic match RPC with row locking and match return data", () => {
    const migration = readMigration();

    expect(migration).toContain(
      "CREATE OR REPLACE FUNCTION record_swipe_and_check_match(",
    );
    expect(migration).toContain("FOR UPDATE");
    expect(migration).toContain("matched boolean");
    expect(migration).toContain("venue_id uuid");
    expect(migration).toContain("UPDATE sessions");
    expect(migration).toContain("matched_venue_id = input_venue_id");
    expect(migration).toContain("status = 'matched'");
  });
});

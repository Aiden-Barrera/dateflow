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
    expect(migration).not.toContain("created_at = now()");
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
    expect(migration).toContain("current_matched_venue_id text");
    expect(migration).toContain("current_matched_venue_id = input_venue_id::text");
  });

  it("rejects swipes when the session is not ready and when the venue is from another session", () => {
    const migration = readMigration();

    expect(migration).toContain(
      "IF current_status <> 'ready_to_swipe' THEN",
    );
    expect(migration).toContain(
      "RAISE EXCEPTION 'cannot swipe when session status is %', current_status;",
    );
    expect(migration).toContain("FROM venues");
    expect(migration).toContain("WHERE id = input_venue_id");
    expect(migration).toContain("AND session_id = input_session_id");
    expect(migration).toContain(
      "RAISE EXCEPTION 'venue % does not belong to session %', input_venue_id, input_session_id;",
    );
  });

  it("avoids redundant session and venue index duplication", () => {
    const migration = readMigration();

    expect(migration).not.toContain("CREATE INDEX idx_swipes_session_venue");
  });
});

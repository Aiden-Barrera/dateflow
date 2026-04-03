import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migrationPath = join(
  process.cwd(),
  "supabase",
  "migrations",
  "008_add_matched_at_to_sessions.sql",
);

function readMigration(): string {
  return readFileSync(migrationPath, "utf8");
}

describe("008_add_matched_at_to_sessions.sql", () => {
  it("adds a persisted matched_at column to sessions", () => {
    const migration = readMigration();

    expect(migration).toContain("ALTER TABLE sessions");
    expect(migration).toContain("ADD COLUMN matched_at timestamptz");
  });

  it("stores matched_at when a mutual like becomes a match", () => {
    const migration = readMigration();

    expect(migration).toContain("SET status = 'matched'");
    expect(migration).toContain("matched_venue_id = input_venue_id");
    expect(migration).toContain("matched_at = now()");
  });

  it("clears matched_at when a fallback retry reopens swiping", () => {
    const migration = readMigration();

    expect(migration).toContain("matched_at = null");
    expect(migration).toContain("status = 'ready_to_swipe'");
  });
});

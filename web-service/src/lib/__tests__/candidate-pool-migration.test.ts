import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migrationPath = join(
  process.cwd(),
  "supabase",
  "migrations",
  "005_create_candidate_pools.sql",
);

function readMigration(): string {
  return readFileSync(migrationPath, "utf8");
}

describe("005_create_candidate_pools.sql", () => {
  it("creates the session candidate pool tables", () => {
    const migration = readMigration();

    expect(migration).toContain("CREATE TABLE session_candidate_pools");
    expect(migration).toContain("session_id                   uuid");
    expect(migration).toContain("source                       text");
    expect(migration).toContain("CREATE TABLE session_candidate_pool_items");
    expect(migration).toContain("pool_id                      uuid");
    expect(migration).toContain("place_id                     text");
    expect(migration).toContain("raw_types                    text[]");
    expect(migration).toContain("raw_tags                     text[]");
    expect(migration).toContain("source_rank                  int");
  });

  it("creates generation batches and links surfaced venues back to the batch", () => {
    const migration = readMigration();

    expect(migration).toContain("CREATE TABLE venue_generation_batches");
    expect(migration).toContain("batch_number                 int");
    expect(migration).toContain("generation_strategy          text");
    expect(migration).toContain(
      "ALTER TABLE venues ADD COLUMN generation_batch_id uuid REFERENCES venue_generation_batches(id)",
    );
    expect(migration).toContain(
      "ALTER TABLE venues ADD COLUMN surfaced_cycle int NOT NULL DEFAULT 1",
    );
  });

  it("adds the expected uniqueness and lookup indexes", () => {
    const migration = readMigration();

    expect(migration).toContain("UNIQUE (session_id, source)");
    expect(migration).toContain("UNIQUE (pool_id, place_id)");
    expect(migration).toContain("UNIQUE (session_id, batch_number)");
    expect(migration).toContain(
      "CREATE INDEX idx_candidate_pool_items_pool_rank",
    );
    expect(migration).toContain(
      "CREATE INDEX idx_generation_batches_session",
    );
  });
});

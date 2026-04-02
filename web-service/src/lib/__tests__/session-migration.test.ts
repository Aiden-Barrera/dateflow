import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("001_create_sessions.sql", () => {
  const migration = readFileSync(
    resolve(process.cwd(), "supabase/migrations/001_create_sessions.sql"),
    "utf8",
  );

  it("allows the extended fallback and retry session statuses", () => {
    expect(migration).toContain("'fallback_pending'");
    expect(migration).toContain("'retry_pending'");
    expect(migration).toContain("'reranking'");
  });

  it("keeps fallback and retry states indexed as active sessions", () => {
    expect(migration).toContain("WHERE status NOT IN ('matched', 'expired')");
  });
});

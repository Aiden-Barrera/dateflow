import { describe, it, expect, beforeEach, vi } from "vitest";

// We need to test the module fresh each time because it uses a singleton.
// vi.resetModules() clears the module cache so each test gets a clean import.

describe("createSupabaseClient", () => {
  beforeEach(() => {
    // Reset the module cache so the singleton doesn't carry over between tests
    vi.resetModules();
  });

  it("throws an error when NEXT_PUBLIC_SUPABASE_URL is missing", async () => {
    // Simulate: someone cloned the repo but forgot to set up .env.local
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-key");

    const { createSupabaseClient } = await import("../supabase");
    expect(() => createSupabaseClient()).toThrow("NEXT_PUBLIC_SUPABASE_URL");
  });

  it("throws an error when NEXT_PUBLIC_SUPABASE_ANON_KEY is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");

    const { createSupabaseClient } = await import("../supabase");
    expect(() => createSupabaseClient()).toThrow(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  });

  it("returns a Supabase client when env vars are set", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");

    const { createSupabaseClient } = await import("../supabase");
    const client = createSupabaseClient();

    // The Supabase client exposes a .from() method for querying tables
    expect(client).toBeDefined();
    expect(typeof client.from).toBe("function");
  });

  it("returns the same instance when called twice (singleton)", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");

    const { createSupabaseClient } = await import("../supabase");
    const first = createSupabaseClient();
    const second = createSupabaseClient();

    // Same reference, not just equal — proof it's the exact same object
    expect(first).toBe(second);
  });
});

import { describe, it, expect, beforeEach, vi } from "vitest";

// Same singleton isolation pattern as the public client tests —
// vi.resetModules() clears the module cache so each test gets a fresh import.

describe("getSupabaseServerClient", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("throws an error when SUPABASE_SERVICE_ROLE_KEY is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");

    const { getSupabaseServerClient } = await import("../supabase-server");
    expect(() => getSupabaseServerClient()).toThrow(
      "SUPABASE_SERVICE_ROLE_KEY"
    );
  });

  it("throws an error when NEXT_PUBLIC_SUPABASE_URL is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");

    const { getSupabaseServerClient } = await import("../supabase-server");
    expect(() => getSupabaseServerClient()).toThrow(
      "NEXT_PUBLIC_SUPABASE_URL"
    );
  });

  it("returns a Supabase client when env vars are set", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");

    const { getSupabaseServerClient } = await import("../supabase-server");
    const client = getSupabaseServerClient();

    expect(client).toBeDefined();
    expect(typeof client.from).toBe("function");
  });

  it("returns the same instance when called twice (singleton)", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");

    const { getSupabaseServerClient } = await import("../supabase-server");
    const first = getSupabaseServerClient();
    const second = getSupabaseServerClient();

    expect(first).toBe(second);
  });
});

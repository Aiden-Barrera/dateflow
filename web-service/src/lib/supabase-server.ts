import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let serverClient: SupabaseClient | null = null;

/**
 * Returns a Supabase client authenticated with the service role key.
 *
 * This client bypasses Row Level Security — use it ONLY in server-side code
 * (API routes, services). Never import this in client components.
 */
export function getSupabaseServerClient(): SupabaseClient {
  if (serverClient) {
    return serverClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL — add it to .env.local (see .env.example)"
    );
  }

  if (!serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY — add it to .env.local (see .env.example)"
    );
  }

  serverClient = createClient(url, serviceRoleKey);
  return serverClient;
}

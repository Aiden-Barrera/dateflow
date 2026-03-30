/**
 * Which person in the session: Person A created it, Person B joined via link.
 */
export type Role = "a" | "b";

/**
 * Three spending tiers. Maps to Google Places price_level:
 *   BUDGET   → price_level 1 ($)
 *   MODERATE → price_level 2 ($$)
 *   UPSCALE  → price_level 3-4 ($$$)
 */
export type BudgetLevel = "BUDGET" | "MODERATE" | "UPSCALE";

/**
 * The types of activities a user is open to. Users select one or more.
 * "Surprise me" in the UI selects all four.
 */
export type Category = "RESTAURANT" | "BAR" | "ACTIVITY" | "EVENT";

/**
 * A geographic coordinate with a human-readable label.
 * The label is what the user sees ("Downtown Austin", "Current Location")
 * — not a full street address, for privacy.
 */
export type Location = {
  readonly lat: number;
  readonly lng: number;
  readonly label: string;
};

/**
 * A stored preference — one person's inputs for a session.
 * Each session has exactly two: one for role "a", one for role "b".
 */
export type Preference = {
  readonly id: string;
  readonly sessionId: string;
  readonly role: Role;
  readonly location: Location;
  readonly budget: BudgetLevel;
  readonly categories: readonly Category[];
  readonly createdAt: Date;
};

/**
 * What the client sends when submitting preferences.
 * No id or createdAt — the database generates those.
 */
export type PreferenceInput = {
  readonly role: Role;
  readonly location: Location;
  readonly budget: BudgetLevel;
  readonly categories: readonly Category[];
};

// ---------------------------------------------------------------------------
// Database layer
// ---------------------------------------------------------------------------

/**
 * The raw row shape returned by Supabase when querying the preferences table.
 * Column names are snake_case. The location column is JSONB (Supabase auto-
 * parses it into an object). Categories is a Postgres text[] (returned as
 * a JS array).
 */
export type PreferenceRow = {
  readonly id: string;
  readonly session_id: string;
  readonly role: Role;
  readonly location: Location;
  readonly budget: BudgetLevel;
  readonly categories: Category[];
  readonly created_at: string;
};

/**
 * Converts a raw Supabase row into an app-level Preference.
 */
export function toPreference(row: PreferenceRow): Preference {
  return {
    id: row.id,
    sessionId: row.session_id,
    role: row.role,
    location: row.location,
    budget: row.budget,
    categories: row.categories,
    createdAt: new Date(row.created_at),
  };
}


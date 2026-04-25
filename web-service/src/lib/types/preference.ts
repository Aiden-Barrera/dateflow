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

// ---------------------------------------------------------------------------
// Schedule preference types (DS-07A)
// ---------------------------------------------------------------------------

/** Rough time window for when the date should happen. */
export type ScheduleWindow = "this_week" | "next_week" | "two_weeks" | "flexible";

/** Days of the week a user is available. */
export type DayOfWeek = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

/** Preferred block of the day. */
export type TimeOfDay = "afternoon" | "evening" | "night" | "any";

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
  readonly scheduleWindow?: ScheduleWindow;
  readonly availableDays?: readonly DayOfWeek[];
  readonly timeOfDay?: TimeOfDay;
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
  readonly scheduleWindow?: ScheduleWindow;
  readonly availableDays?: readonly DayOfWeek[];
  readonly timeOfDay?: TimeOfDay;
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
  readonly schedule_window: ScheduleWindow | null;
  readonly available_days: DayOfWeek[] | null;
  readonly time_of_day: TimeOfDay | null;
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
    ...(row.schedule_window ? { scheduleWindow: row.schedule_window } : {}),
    ...(row.available_days ? { availableDays: row.available_days } : {}),
    ...(row.time_of_day ? { timeOfDay: row.time_of_day } : {}),
  };
}


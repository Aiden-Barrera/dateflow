import { getSupabaseServerClient } from "../supabase-server";
import {
  toPreference,
  type Preference,
  type PreferenceInput,
  type PreferenceRow,
  type Role,
  type BudgetLevel,
  type Category,
} from "../types/preference";

/**
 * Inserts a preference row for a given session and role.
 *
 * After inserting, checks if both roles have now submitted. If so,
 * transitions the session status from pending_b to both_ready — the
 * signal for DS-03 to begin venue generation.
 */
export async function submitPreference(
  sessionId: string,
  input: PreferenceInput
): Promise<Preference> {
  const supabase = getSupabaseServerClient();

  // 1. Insert the preference row
  const { data, error } = await supabase
    .from("preferences")
    .insert({
      session_id: sessionId,
      role: input.role,
      location: input.location,
      budget: input.budget,
      categories: [...input.categories],
      ...(input.scheduleWindow !== undefined ? { schedule_window: input.scheduleWindow } : {}),
      ...(input.availableDays !== undefined ? { available_days: [...input.availableDays] } : {}),
      ...(input.timeOfDay !== undefined ? { time_of_day: input.timeOfDay } : {}),
    })
    .select()
    .single<PreferenceRow>();

  if (error) {
    throw new Error(error.message);
  }

  const preference = toPreference(data);

  // 2. Check if both roles have now submitted
  const allPrefs = await getPreferences(sessionId);

  if (allPrefs.length >= 2) {
    // 3. Transition session to both_ready — only from pending_b
    const { error: updateError } = await supabase
      .from("sessions")
      .update({ status: "both_ready" })
      .eq("id", sessionId)
      .eq("status", "pending_b");

    if (updateError) {
      throw new Error(updateError.message);
    }
  }

  return preference;
}

/**
 * Retrieves all preferences for a session (0, 1, or 2 rows).
 *
 * Returns an empty array if no preferences have been submitted yet.
 */
export async function getPreferences(sessionId: string): Promise<Preference[]> {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("preferences")
    .select()
    .eq("session_id", sessionId);

  if (error) {
    throw new Error(error.message);
  }

  return (data as PreferenceRow[]).map(toPreference);
}

/**
 * Retrieves exactly two preferences (role "a" and role "b") for a session.
 *
 * Throws if both preferences have not been submitted yet. This is the strict
 * entry point for DS-03 venue generation — it guarantees downstream code
 * always has complete data.
 */
export async function getBothPreferences(
  sessionId: string
): Promise<[Preference, Preference]> {
  const preferences = await getPreferences(sessionId);

  const prefA = preferences.find((p) => p.role === "a");
  const prefB = preferences.find((p) => p.role === "b");

  if (!prefA || !prefB) {
    throw new Error("Both preferences are required");
  }

  return [prefA, prefB];
}

export async function updatePreferenceVibes(
  sessionId: string,
  role: Role,
  input: {
    readonly budget: BudgetLevel;
    readonly categories: readonly Category[];
  },
): Promise<void> {
  const supabase = getSupabaseServerClient();

  const { error } = await supabase
    .from("preferences")
    .update({
      budget: input.budget,
      categories: [...input.categories],
    })
    .eq("session_id", sessionId)
    .eq("role", role);

  if (error) {
    throw new Error(error.message);
  }
}

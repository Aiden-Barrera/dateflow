import type {
  Preference,
  Role,
  Location,
  BudgetLevel,
  Category,
  DayOfWeek,
  ScheduleWindow,
  TimeOfDay,
} from "../types/preference";

/**
 * JSON-safe version of Preference — createdAt becomes an ISO string.
 * This is the shape the API returns and the frontend receives.
 */
export type SerializedPreference = {
  readonly id: string;
  readonly sessionId: string;
  readonly role: Role;
  readonly location: Location;
  readonly budget: BudgetLevel;
  readonly categories: readonly Category[];
  readonly createdAt: string;
  readonly scheduleWindow?: ScheduleWindow;
  readonly availableDays?: readonly DayOfWeek[];
  readonly timeOfDay?: TimeOfDay;
};

/**
 * Converts a Preference (with Date) into a JSON-safe format (with ISO string).
 * Call this before returning a preference from an API route.
 */
export function serializePreference(pref: Preference): SerializedPreference {
  return {
    id: pref.id,
    sessionId: pref.sessionId,
    role: pref.role,
    location: pref.location,
    budget: pref.budget,
    categories: pref.categories,
    createdAt: pref.createdAt.toISOString(),
    ...(pref.scheduleWindow !== undefined ? { scheduleWindow: pref.scheduleWindow } : {}),
    ...(pref.availableDays !== undefined ? { availableDays: pref.availableDays } : {}),
    ...(pref.timeOfDay !== undefined ? { timeOfDay: pref.timeOfDay } : {}),
  };
}

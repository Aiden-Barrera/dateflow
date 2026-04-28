import { NextResponse } from "next/server";
import { checkRateLimit } from "../../../../../lib/rate-limit";
import { enqueueVenueGeneration } from "../../../../../lib/qstash";
import {
  getSession,
  sanitizeDisplayName,
  setInviteeDisplayName,
} from "../../../../../lib/services/session-service";
import {
  getPreferences,
  submitPreference,
} from "../../../../../lib/services/preference-service";
import { serializePreference } from "../../../../../lib/services/preference-serializer";
import { isExpired } from "../../../../../lib/services/session-helpers";
import { generateDemoVenues } from "../../../../../lib/services/demo-venue-service";
import { generateVenues } from "../../../../../lib/services/venue-generation-service";
import { buildSessionRoleCookieValue } from "../../../../../lib/session-role-access";
import type {
  BudgetLevel,
  Category,
  DayOfWeek,
  Role,
  ScheduleWindow,
  TimeOfDay,
} from "../../../../../lib/types/preference";

type RouteParams = {
  params: Promise<{ id: string }>;
};

type GenerationFailureDetails = {
  readonly retryable: boolean;
  readonly userMessage: string;
};

// ---------------------------------------------------------------------------
// Allowed values — used for input validation
// ---------------------------------------------------------------------------

const VALID_ROLES: readonly Role[] = ["a", "b"];
const VALID_BUDGETS: readonly BudgetLevel[] = ["BUDGET", "MODERATE", "UPSCALE"];
const VALID_CATEGORIES: readonly Category[] = [
  "RESTAURANT",
  "BAR",
  "ACTIVITY",
  "EVENT",
];
const MAX_CATEGORIES = 4;
const VALID_SCHEDULE_WINDOWS: readonly ScheduleWindow[] = [
  "this_week",
  "next_week",
  "two_weeks",
  "flexible",
];
const VALID_DAYS_OF_WEEK: readonly DayOfWeek[] = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
];
const VALID_TIMES_OF_DAY: readonly TimeOfDay[] = [
  "afternoon",
  "evening",
  "night",
  "any",
];
const SESSION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

type ValidationResult =
  | {
      valid: true;
      role: Role;
      displayName: string | null;
      location: { lat: number; lng: number; label: string };
      budget: BudgetLevel;
      categories: Category[];
      scheduleWindow?: ScheduleWindow;
      availableDays?: DayOfWeek[];
      timeOfDay?: TimeOfDay;
      demo: boolean;
    }
  | { valid: false; error: string };

function validateBody(body: unknown): ValidationResult {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return { valid: false, error: "Request body must be a JSON object" };
  }

  const {
    role,
    displayName,
    location,
    budget,
    categories,
    scheduleWindow,
    availableDays,
    timeOfDay,
    demo,
  } = body as Record<string, unknown>;

  // Role
  if (!role || !VALID_ROLES.includes(role as Role)) {
    return { valid: false, error: "role must be 'a' or 'b'" };
  }

  let validatedDisplayName: string | null = null;
  if (role === "b") {
    if (typeof displayName !== "string") {
      return { valid: false, error: "displayName is required" };
    }

    try {
      validatedDisplayName = sanitizeDisplayName(displayName);
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : "displayName is invalid",
      };
    }
  }

  // Location
  if (!location || typeof location !== "object" || Array.isArray(location)) {
    return { valid: false, error: "location is required and must be an object" };
  }

  const { lat, lng, label } = location as Record<string, unknown>;

  if (typeof lat !== "number" || lat < -90 || lat > 90) {
    return { valid: false, error: "location.lat must be a number between -90 and 90" };
  }

  if (typeof lng !== "number" || lng < -180 || lng > 180) {
    return { valid: false, error: "location.lng must be a number between -180 and 180" };
  }

  if (typeof label !== "string" || label.trim().length === 0) {
    return { valid: false, error: "location.label is required" };
  }

  // Budget
  if (!budget || !VALID_BUDGETS.includes(budget as BudgetLevel)) {
    return { valid: false, error: "budget must be BUDGET, MODERATE, or UPSCALE" };
  }

  // Categories
  if (!Array.isArray(categories) || categories.length === 0) {
    return { valid: false, error: "categories must be a non-empty array" };
  }

  if (categories.length > MAX_CATEGORIES) {
    return { valid: false, error: `categories must have at most ${MAX_CATEGORIES} items` };
  }

  const invalidCategory = categories.find(
    (c: unknown) => !VALID_CATEGORIES.includes(c as Category)
  );
  if (invalidCategory !== undefined) {
    return { valid: false, error: `Invalid category: ${invalidCategory}` };
  }

  // Schedule fields (all optional)
  if (scheduleWindow !== undefined && !VALID_SCHEDULE_WINDOWS.includes(scheduleWindow as ScheduleWindow)) {
    return { valid: false, error: "scheduleWindow must be this_week, next_week, two_weeks, or flexible" };
  }

  if (availableDays !== undefined) {
    if (!Array.isArray(availableDays) || availableDays.length === 0) {
      return { valid: false, error: "availableDays must be a non-empty array" };
    }
    const invalidDay = availableDays.find((d: unknown) => !VALID_DAYS_OF_WEEK.includes(d as DayOfWeek));
    if (invalidDay !== undefined) {
      return { valid: false, error: `Invalid day: ${invalidDay}` };
    }
  }

  if (timeOfDay !== undefined && !VALID_TIMES_OF_DAY.includes(timeOfDay as TimeOfDay)) {
    return { valid: false, error: "timeOfDay must be afternoon, evening, night, or any" };
  }

  return {
    valid: true,
    role: role as Role,
    displayName: validatedDisplayName,
    location: { lat: lat as number, lng: lng as number, label: (label as string).trim() },
    budget: budget as BudgetLevel,
    categories: categories as Category[],
    ...(scheduleWindow !== undefined ? { scheduleWindow: scheduleWindow as ScheduleWindow } : {}),
    ...(availableDays !== undefined ? { availableDays: availableDays as DayOfWeek[] } : {}),
    ...(timeOfDay !== undefined ? { timeOfDay: timeOfDay as TimeOfDay } : {}),
    demo: demo === true,
  };
}

function classifyGenerationFailure(error: unknown): GenerationFailureDetails {
  void error;

  return {
    retryable: true,
    userMessage:
      "We saved your preferences, but couldn't start venue generation. Please try again shortly.",
  };
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

/**
 * POST /api/sessions/[id]/preferences
 *
 * Submits preferences for a role (Person A or Person B) within a session.
 * Validates all inputs, checks session state, then delegates to the service.
 */
export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const rateLimited = checkRateLimit(request, {
    key: "sessions:preferences",
    limit: 10,
    windowMs: 60 * 1000,
  });
  if (rateLimited) return rateLimited;

  if (!SESSION_ID_PATTERN.test(id)) {
    return NextResponse.json(
      { error: "Session ID must be a valid UUID" },
      { status: 400 }
    );
  }

  // 1. Parse JSON body
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON" },
      { status: 400 }
    );
  }

  // 2. Validate input fields
  const validation = validateBody(rawBody);

  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const { role, displayName, location, budget, categories, scheduleWindow, availableDays, timeOfDay, demo } = validation;

  try {
    // 3. Check session exists
    const session = await getSession(id);

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // 4. Check session is not expired
    if (session.status === "expired" || isExpired(session)) {
      return NextResponse.json(
        { error: "This session has expired" },
        { status: 410 }
      );
    }

    // 5. Check session is accepting preferences
    if (session.status !== "pending_b") {
      return NextResponse.json(
        { error: "This session is not accepting preferences" },
        { status: 409 }
      );
    }

    // 6. Check for duplicate preference
    const existing = await getPreferences(id);
    const alreadySubmitted = existing.some((p) => p.role === role);
    const willCompleteBothPreferences = existing.length === 1 && !alreadySubmitted;

    if (alreadySubmitted) {
      return NextResponse.json(
        { error: "Preference already submitted for this role" },
        { status: 409 }
      );
    }

    // 7. Submit preference (and trigger transition if both ready)
    const preference = await submitPreference(id, {
      role,
      location,
      budget,
      categories,
      ...(scheduleWindow !== undefined ? { scheduleWindow } : {}),
      ...(availableDays !== undefined ? { availableDays } : {}),
      ...(timeOfDay !== undefined ? { timeOfDay } : {}),
    });

    if (role === "b" && displayName) {
      await setInviteeDisplayName(id, displayName);
    }

    const response = NextResponse.json(
      { preference: serializePreference(preference) },
      { status: 201 }
    );
    response.headers.append(
      "set-cookie",
      buildSessionRoleCookieValue(id, role),
    );

    if (willCompleteBothPreferences) {
      if (demo) {
        try {
          await generateDemoVenues(id);
        } catch (demoGenerationErr) {
          console.error(
            `[POST /api/sessions/${id}/preferences] Demo venue generation failed after preference submission:`,
            demoGenerationErr,
          );
        }
        return response;
      }

      try {
        await enqueueVenueGeneration(id);
      } catch (enqueueErr) {
        console.error(
          `[POST /api/sessions/${id}/preferences] Failed to enqueue generation, falling back to direct generation:`,
          enqueueErr
        );

        try {
          await generateVenues(id);
        } catch (generationErr) {
          console.error(
            `[POST /api/sessions/${id}/preferences] Direct generation fallback failed:`,
            generationErr
          );

          const failure = classifyGenerationFailure(generationErr);

          return NextResponse.json(
            {
              error: failure.userMessage,
              retryable: failure.retryable,
              preferenceSaved: true,
            },
            {
              status: 503,
              headers: response.headers,
            },
          );
        }
      }
    }

    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    const isUniqueViolation = message.includes("unique") || message.includes("duplicate");

    if (isUniqueViolation) {
      return NextResponse.json(
        { error: "Preference already submitted for this role" },
        { status: 409 }
      );
    }

    console.error(`[POST /api/sessions/${id}/preferences] Failed:`, err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

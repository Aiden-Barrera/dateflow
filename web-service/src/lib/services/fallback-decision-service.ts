import { getSupabaseServerClient } from "../supabase-server";
import { toSession, type Session, type SessionRow } from "../types/session";
import type { BudgetLevel, Category, Role } from "../types/preference";
import {
  rerankStoredCandidates,
  type RetryPreferencesInput,
} from "./venue-retry-service";

const NOT_FOUND_CODE = "PGRST116";

type StoredRetryPreferences = {
  readonly categories: readonly Category[];
  readonly budget: BudgetLevel;
  readonly radiusMeters: number | null;
};

const CATEGORY_ORDER: readonly Category[] = [
  "RESTAURANT",
  "BAR",
  "ACTIVITY",
  "EVENT",
];

const BUDGET_ORDER: readonly BudgetLevel[] = [
  "BUDGET",
  "MODERATE",
  "UPSCALE",
];

export async function acceptFallbackSuggestion(
  sessionId: string,
): Promise<Session> {
  const session = await getFallbackPendingSession(sessionId);

  if (!session.matchedVenueId) {
    throw new Error("Fallback suggestion is missing a venue");
  }

  return updateSession(sessionId, {
    status: "matched",
    matched_at: new Date().toISOString(),
  });
}

export async function requestFallbackRetry(
  sessionId: string,
  role: Role,
  preferences: RetryPreferencesInput,
): Promise<Session> {
  const session = await getFallbackPendingSession(sessionId);
  const confirmedSession = await updateSession(sessionId, {
    retry_initiator_role: session.retryInitiatorRole ?? role,
    ...buildRetryConfirmationUpdates(role, preferences),
  });

  if (!hasBothRetryConfirmations(confirmedSession)) {
    return confirmedSession;
  }

  await updateSessionStatus(sessionId, "reranking");

  try {
    const result = await rerankStoredCandidates(
      sessionId,
      mergeRetryPreferences(
        confirmedSession.retryAPreferences,
        confirmedSession.retryBPreferences,
      ),
    );

    if (result.requiresFullRegeneration) {
      return updateSession(sessionId, {
        status: "retry_pending",
        matched_venue_id: null,
        matched_at: null,
        ...clearRetryCoordination(),
      });
    }

    await clearSessionSwipes(sessionId);

    return updateSession(sessionId, {
      status: "ready_to_swipe",
      matched_venue_id: null,
      matched_at: null,
      ...clearRetryCoordination(),
    });
  } catch (error) {
    await updateSession(sessionId, {
      status: "fallback_pending",
      ...clearRetryCoordination(),
    });
    throw error;
  }
}

export function shouldWaitForPartnerRetryConfirmation(
  session: Session,
  role: Role | null,
): boolean {
  if (session.status !== "fallback_pending" || !role) {
    return false;
  }

  return role === "a"
    ? session.retryAConfirmedAt !== null && session.retryBConfirmedAt === null
    : session.retryBConfirmedAt !== null && session.retryAConfirmedAt === null;
}

async function getFallbackPendingSession(sessionId: string): Promise<Session> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .single<SessionRow>();

  if (error) {
    if (error.code === NOT_FOUND_CODE) {
      throw new Error("Session not found");
    }

    throw new Error(error.message);
  }

  const session = toSession(data);

  if (session.status !== "fallback_pending") {
    throw new Error("Session must be in fallback_pending to resolve fallback");
  }

  return session;
}

async function updateSessionStatus(
  sessionId: string,
  status: "matched" | "retry_pending" | "reranking" | "fallback_pending",
): Promise<Session> {
  return updateSession(sessionId, { status });
}

async function clearSessionSwipes(sessionId: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("swipes")
    .delete()
    .eq("session_id", sessionId);

  if (error) {
    throw new Error(error.message);
  }
}

function hasBothRetryConfirmations(session: Session): boolean {
  return (
    session.retryAConfirmedAt !== null &&
    session.retryBConfirmedAt !== null &&
    session.retryAPreferences !== null &&
    session.retryBPreferences !== null
  );
}

function buildRetryConfirmationUpdates(
  role: Role,
  preferences: RetryPreferencesInput,
): Pick<
  SessionRow,
  | "retry_a_confirmed_at"
  | "retry_b_confirmed_at"
  | "retry_a_preferences"
  | "retry_b_preferences"
> {
  const storedPreferences: StoredRetryPreferences = {
    categories: [...preferences.categories],
    budget: preferences.budget,
    radiusMeters: preferences.radiusMeters ?? null,
  };
  const confirmedAt = new Date().toISOString();

  if (role === "a") {
    return {
      retry_a_confirmed_at: confirmedAt,
      retry_a_preferences: storedPreferences,
    };
  }

  return {
    retry_b_confirmed_at: confirmedAt,
    retry_b_preferences: storedPreferences,
  };
}

function clearRetryCoordination(): Pick<
  SessionRow,
  | "retry_initiator_role"
  | "retry_a_confirmed_at"
  | "retry_b_confirmed_at"
  | "retry_a_preferences"
  | "retry_b_preferences"
> {
  return {
    retry_initiator_role: null,
    retry_a_confirmed_at: null,
    retry_b_confirmed_at: null,
    retry_a_preferences: null,
    retry_b_preferences: null,
  };
}

function mergeRetryPreferences(
  preferenceA: Record<string, unknown> | null,
  preferenceB: Record<string, unknown> | null,
): RetryPreferencesInput {
  const normalizedA = normalizeStoredRetryPreferences(preferenceA);
  const normalizedB = normalizeStoredRetryPreferences(preferenceB);

  if (!normalizedA || !normalizedB) {
    throw new Error("Both retry preferences are required before reranking");
  }

  return {
    categories: CATEGORY_ORDER.filter(
      (category) =>
        normalizedA.categories.includes(category) ||
        normalizedB.categories.includes(category),
    ),
    budget: mergeBudget(normalizedA.budget, normalizedB.budget),
    radiusMeters: mergeRadius(
      normalizedA.radiusMeters,
      normalizedB.radiusMeters,
    ),
  };
}

function normalizeStoredRetryPreferences(
  value: Record<string, unknown> | null,
): StoredRetryPreferences | null {
  if (!value) {
    return null;
  }

  const categories = Array.isArray(value.categories)
    ? value.categories.filter((category): category is Category =>
        CATEGORY_ORDER.includes(category as Category),
      )
    : [];
  const budget = BUDGET_ORDER.includes(value.budget as BudgetLevel)
    ? (value.budget as BudgetLevel)
    : null;
  const radiusMeters =
    typeof value.radiusMeters === "number" ? value.radiusMeters : null;

  if (categories.length === 0 || !budget) {
    return null;
  }

  return {
    categories,
    budget,
    radiusMeters,
  };
}

function mergeBudget(
  budgetA: BudgetLevel,
  budgetB: BudgetLevel,
): BudgetLevel {
  const mergedIndex = Math.min(
    BUDGET_ORDER.indexOf(budgetA),
    BUDGET_ORDER.indexOf(budgetB),
  );

  return BUDGET_ORDER[mergedIndex] ?? "MODERATE";
}

function mergeRadius(
  radiusA: number | null,
  radiusB: number | null,
): number | undefined {
  if (radiusA === null) {
    return radiusB ?? undefined;
  }

  if (radiusB === null) {
    return radiusA;
  }

  return Math.min(radiusA, radiusB);
}

async function updateSession(
  sessionId: string,
  updates: Partial<
    Pick<
      SessionRow,
      | "status"
      | "matched_venue_id"
      | "matched_at"
      | "retry_initiator_role"
      | "retry_a_confirmed_at"
      | "retry_b_confirmed_at"
      | "retry_a_preferences"
      | "retry_b_preferences"
    >
  >,
): Promise<Session> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("sessions")
    .update(updates)
    .eq("id", sessionId)
    .select("*")
    .single<SessionRow>();

  if (error) {
    throw new Error(error.message);
  }

  return toSession(data);
}

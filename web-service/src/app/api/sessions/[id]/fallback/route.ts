import { NextResponse } from "next/server";
import { readBoundSessionRole } from "../../../../../lib/session-role-access";
import {
  acceptFallbackSuggestion,
  requestFallbackRetry,
  shouldWaitForPartnerRetryConfirmation,
  shouldWaitForPartnerAcceptConfirmation,
  isRetryInProgress,
} from "../../../../../lib/services/fallback-decision-service";
import { getSession } from "../../../../../lib/services/session-service";
import { serializeSession } from "../../../../../lib/services/session-serializer";
import type { BudgetLevel, Category, Role } from "../../../../../lib/types/preference";

type RouteParams = {
  params: Promise<{ id: string }>;
};

type FallbackAction = "accept" | "retry";

type RequestBody = {
  action?: unknown;
  preferences?: {
    categories?: unknown;
    budget?: unknown;
    radiusMeters?: unknown;
  };
};

const VALID_BUDGETS: readonly BudgetLevel[] = ["BUDGET", "MODERATE", "UPSCALE"];
const VALID_CATEGORIES: readonly Category[] = [
  "RESTAURANT",
  "BAR",
  "ACTIVITY",
  "EVENT",
];
const VALID_ROLES: readonly Role[] = ["a", "b"];

function isFallbackAction(value: unknown): value is FallbackAction {
  return value === "accept" || value === "retry";
}

function validateRetryPreferences(body: RequestBody): {
  valid: true;
  preferences: {
    categories: readonly Category[];
    budget: BudgetLevel;
    radiusMeters?: number;
  };
} | {
  valid: false;
  error: string;
} {
  if (!body.preferences || typeof body.preferences !== "object") {
    return {
      valid: false,
      error: "preferences are required when action is 'retry'",
    };
  }

  const { categories, budget, radiusMeters } = body.preferences;

  if (!Array.isArray(categories) || categories.length === 0) {
    return {
      valid: false,
      error: "preferences.categories must be a non-empty array",
    };
  }

  if (categories.some((category) => !VALID_CATEGORIES.includes(category as Category))) {
    return {
      valid: false,
      error: "preferences.categories contains an invalid category",
    };
  }

  if (!VALID_BUDGETS.includes(budget as BudgetLevel)) {
    return {
      valid: false,
      error: "preferences.budget must be BUDGET, MODERATE, or UPSCALE",
    };
  }

  if (radiusMeters !== undefined && typeof radiusMeters !== "number") {
    return {
      valid: false,
      error: "preferences.radiusMeters must be a number when provided",
    };
  }

  return {
    valid: true,
    preferences: {
      categories: categories as readonly Category[],
      budget: budget as BudgetLevel,
      radiusMeters: radiusMeters as number | undefined,
    },
  };
}

export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;
  // TODO(ds-06): enforce session ownership once authenticated users and session history exist.
  const boundRole = readBoundSessionRole(id, request.headers.get("cookie"));

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON" },
      { status: 400 },
    );
  }

  if (!isFallbackAction(body.action)) {
    return NextResponse.json(
      { error: "action must be 'accept' or 'retry'" },
      { status: 400 },
    );
  }

  const retryValidation =
    body.action === "retry" ? validateRetryPreferences(body) : null;

  if (retryValidation && !retryValidation.valid) {
    return NextResponse.json(
      { error: retryValidation.error },
      { status: 400 },
    );
  }

  const retryPreferences =
    body.action === "retry" && retryValidation
      ? retryValidation.preferences
      : null;

  try {
    if (!boundRole || !VALID_ROLES.includes(boundRole)) {
      return NextResponse.json(
        { error: "This session requires role-bound access before resolving fallback" },
        { status: 403 },
      );
    }

    if (body.action === "accept") {
      // Guard: if the partner has already initiated a retry, accepting the
      // fallback would silently override their choice. Reject instead and let
      // the client show the partner_confirm view.
      const currentSession = await getSession(id);
      if (currentSession && isRetryInProgress(currentSession)) {
        return NextResponse.json(
          {
            error:
              "Your partner has already requested a new mix. Please confirm or decline the retry instead of locking the plan.",
          },
          { status: 409 },
        );
      }

      const session = await acceptFallbackSuggestion(id, boundRole);

      return NextResponse.json({
        session: serializeSession(session),
        acceptWaitingForPartner: shouldWaitForPartnerAcceptConfirmation(
          session,
          boundRole,
        ),
      });
    }

    if (!retryPreferences) {
      return NextResponse.json(
        { error: "preferences are required when action is 'retry'" },
        { status: 400 },
      );
    }

    const session = await requestFallbackRetry(id, boundRole, retryPreferences);

    return NextResponse.json({
      session: serializeSession(session),
      retryWaitingForPartner: shouldWaitForPartnerRetryConfirmation(
        session,
        boundRole,
      ),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";

    if (message.includes("Session not found")) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 },
      );
    }

    if (message.includes("fallback_pending")) {
      return NextResponse.json(
        { error: "Session is not waiting on a fallback decision" },
        { status: 409 },
      );
    }

    console.error(`[POST /api/sessions/${id}/fallback] Failed:`, err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}

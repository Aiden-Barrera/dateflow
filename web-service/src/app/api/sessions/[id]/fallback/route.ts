import { NextResponse } from "next/server";
import {
  acceptFallbackSuggestion,
  requestFallbackRetry,
} from "../../../../../lib/services/fallback-decision-service";
import { serializeSession } from "../../../../../lib/services/session-serializer";
import type { BudgetLevel, Category } from "../../../../../lib/types/preference";

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
    if (body.action === "accept") {
      const session = await acceptFallbackSuggestion(id);

      return NextResponse.json({ session: serializeSession(session) });
    }

    if (!retryPreferences) {
      return NextResponse.json(
        { error: "preferences are required when action is 'retry'" },
        { status: 400 },
      );
    }

    const session = await requestFallbackRetry(id, retryPreferences);

    return NextResponse.json({ session: serializeSession(session) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";

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

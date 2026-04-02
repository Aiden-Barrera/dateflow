import { NextResponse } from "next/server";
import { getSession } from "../../../../../lib/services/session-service";
import { recordSwipe } from "../../../../../lib/services/swipe-service";
import { isExpired } from "../../../../../lib/services/session-helpers";
import type { Role } from "../../../../../lib/types/preference";

type RouteParams = {
  params: Promise<{ id: string }>;
};

type SwipeRequestBody = {
  venueId?: unknown;
  role?: unknown;
  liked?: unknown;
};

const VALID_ROLES: readonly Role[] = ["a", "b"];

type ValidationResult =
  | {
      valid: true;
      venueId: string;
      role: Role;
      liked: boolean;
    }
  | {
      valid: false;
      error: string;
    };

function validateBody(body: unknown): ValidationResult {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return { valid: false, error: "Request body must be a JSON object" };
  }

  const { venueId, role, liked } = body as SwipeRequestBody;

  if (typeof venueId !== "string" || venueId.trim().length === 0) {
    return { valid: false, error: "venueId is required" };
  }

  if (!VALID_ROLES.includes(role as Role)) {
    return { valid: false, error: "role must be 'a' or 'b'" };
  }

  if (typeof liked !== "boolean") {
    return { valid: false, error: "liked must be a boolean" };
  }

  return {
    valid: true,
    venueId: venueId.trim(),
    role: role as Role,
    liked,
  };
}

export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON" },
      { status: 400 },
    );
  }

  const validation = validateBody(rawBody);
  if (!validation.valid) {
    return NextResponse.json(
      { error: validation.error },
      { status: 400 },
    );
  }

  try {
    const session = await getSession(id);

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 },
      );
    }

    if (session.status === "expired" || isExpired(session)) {
      return NextResponse.json(
        { error: "This session has expired" },
        { status: 410 },
      );
    }

    if (session.status === "fallback_pending") {
      return NextResponse.json(
        {
          error:
            "This session is awaiting a fallback decision and is not accepting swipes",
        },
        { status: 409 },
      );
    }

    if (session.status !== "ready_to_swipe") {
      return NextResponse.json(
        { error: "This session is not accepting swipes" },
        { status: 409 },
      );
    }

    const result = await recordSwipe(
      id,
      validation.venueId,
      validation.role,
      validation.liked,
    );

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";

    if (message.includes("current round") || message.includes("Venue ")) {
      return NextResponse.json(
        { error: message },
        { status: 400 },
      );
    }

    if (message.includes("session status")) {
      return NextResponse.json(
        { error: message },
        { status: 409 },
      );
    }

    console.error(`[POST /api/sessions/${id}/swipes] Failed:`, err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}

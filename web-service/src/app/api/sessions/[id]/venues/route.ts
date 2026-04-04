import { NextResponse } from "next/server";
import { getSession } from "../../../../../lib/services/session-service";
import { getVenues } from "../../../../../lib/services/venue-generation-service";

type RouteParams = {
  params: Promise<{ id: string }>;
};

class InvalidRoundError extends Error {
  constructor() {
    super("Round must be 1, 2, or 3");
    this.name = "InvalidRoundError";
  }
}

function parseRound(value: string | null): number | undefined {
  if (value === null) {
    return undefined;
  }

  const round = Number(value);
  if (!Number.isInteger(round) || round < 1 || round > 3) {
    throw new InvalidRoundError();
  }

  return round;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;

  try {
    const session = await getSession(id);

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    if (
      session.status !== "ready_to_swipe" &&
      session.status !== "matched" &&
      session.status !== "fallback_pending"
    ) {
      return NextResponse.json(
        { error: "Venues are not ready yet" },
        { status: 409 }
      );
    }

    const url = new URL(request.url);
    const round = parseRound(url.searchParams.get("round"));
    const venues = await getVenues(id, round);

    return NextResponse.json({ venues });
  } catch (err) {
    if (err instanceof InvalidRoundError) {
      return NextResponse.json(
        { error: err.message },
        { status: 400 }
      );
    }

    console.error(`[GET /api/sessions/${id}/venues] Failed:`, err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

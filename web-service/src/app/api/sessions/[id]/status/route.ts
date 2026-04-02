import { NextResponse } from "next/server";
import { getSession } from "../../../../../lib/services/session-service";
import { getCurrentRound } from "../../../../../lib/services/round-manager";
import { getRoundCompletion } from "../../../../../lib/services/swipe-service";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;

  try {
    const session = await getSession(id);

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 },
      );
    }

    if (
      session.status === "matched" ||
      session.status === "expired" ||
      session.status === "fallback_pending" ||
      session.status === "retry_pending" ||
      session.status === "reranking"
    ) {
      return NextResponse.json({
        status: session.status,
        matchedVenueId: session.matchedVenueId,
        currentRound: undefined,
        roundComplete: undefined,
      });
    }

    const currentRound = await getCurrentRound(id);
    const completion = await getRoundCompletion(id, currentRound);

    return NextResponse.json({
      status: session.status,
      matchedVenueId: session.matchedVenueId,
      currentRound,
      roundComplete: completion.complete,
    });
  } catch (err) {
    console.error(`[GET /api/sessions/${id}/status] Failed:`, err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}

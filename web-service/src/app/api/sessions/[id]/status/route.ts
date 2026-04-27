import { NextResponse } from "next/server";
import { readBoundSessionRole } from "../../../../../lib/session-role-access";
import {
  shouldWaitForPartnerRetryConfirmation,
  hasPartnerInitiatedRetry,
} from "../../../../../lib/services/fallback-decision-service";
import { getSession } from "../../../../../lib/services/session-service";
import { getCurrentRound } from "../../../../../lib/services/round-manager";
import { getRoundCompletion } from "../../../../../lib/services/swipe-service";
import { isExpired } from "../../../../../lib/services/session-helpers";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const boundRole = readBoundSessionRole(id, request.headers.get("cookie"));

  try {
    const session = await getSession(id);

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 },
      );
    }

    if (session.status === "expired" || isExpired(session)) {
      return NextResponse.json({
        status: "expired",
        matchedVenueId: session.matchedVenueId,
      });
    }

    if (
      session.status === "matched" ||
      session.status === "retry_pending" ||
      session.status === "reranking" ||
      session.status === "pending_b" ||
      session.status === "both_ready" ||
      session.status === "generating" ||
      session.status === "generation_failed"
    ) {
      return NextResponse.json({
        status: session.status,
        matchedVenueId: session.matchedVenueId,
      });
    }

    if (session.status === "fallback_pending") {
      return NextResponse.json({
        status: session.status,
        matchedVenueId: session.matchedVenueId,
        // True when the viewer has already confirmed retry and is waiting on
        // their partner — shows "waiting for partner" screen.
        retryWaitingForPartner: shouldWaitForPartnerRetryConfirmation(
          session,
          boundRole,
        ),
        // True when the viewer's partner has already clicked "Try a new mix"
        // but the viewer hasn't responded yet — viewer should see the
        // "partner_confirm" variant of the fallback screen (no lock button).
        partnerInitiatedRetry: hasPartnerInitiatedRetry(session, boundRole),
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

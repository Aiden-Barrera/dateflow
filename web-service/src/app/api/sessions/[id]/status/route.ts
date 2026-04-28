import { NextResponse } from "next/server";
import { checkRateLimit } from "../../../../../lib/rate-limit";
import { readBoundSessionRole } from "../../../../../lib/session-role-access";
import {
  shouldWaitForPartnerRetryConfirmation,
  hasPartnerInitiatedRetry,
  shouldWaitForPartnerAcceptConfirmation,
  hasPartnerInitiatedAccept,
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
  const rateLimited = checkRateLimit(request, {
    key: "sessions:status",
    limit: 30,
    windowMs: 60 * 1000,
  });
  if (rateLimited) return rateLimited;

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
        // Retry coordination
        retryWaitingForPartner: shouldWaitForPartnerRetryConfirmation(
          session,
          boundRole,
        ),
        partnerInitiatedRetry: hasPartnerInitiatedRetry(session, boundRole),
        // Accept (lock-in) coordination
        acceptWaitingForPartner: shouldWaitForPartnerAcceptConfirmation(
          session,
          boundRole,
        ),
        partnerInitiatedAccept: hasPartnerInitiatedAccept(session, boundRole),
      });
    }

    const currentRound = await getCurrentRound(id);
    const completion = await getRoundCompletion(id, currentRound);

    // Whether the calling user has personally finished swiping this round
    // (their partner may still be going). Used by the client to show
    // "waiting for partner" instead of re-loading the swipe deck.
    const viewerRoundComplete =
      boundRole === "a"
        ? completion.roleACount === completion.total && completion.total > 0
        : boundRole === "b"
          ? completion.roleBCount === completion.total && completion.total > 0
          : false;

    return NextResponse.json({
      status: session.status,
      matchedVenueId: session.matchedVenueId,
      currentRound,
      roundComplete: completion.complete,
      viewerRoundComplete,
    });
  } catch (err) {
    console.error(`[GET /api/sessions/${id}/status] Failed:`, err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}

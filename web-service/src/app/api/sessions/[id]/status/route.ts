import { NextResponse } from "next/server";
import { getSession } from "../../../../../lib/services/session-service";
import { getCurrentRound } from "../../../../../lib/services/round-manager";
import { getRoundCompletion } from "../../../../../lib/services/swipe-service";
import { isExpired } from "../../../../../lib/services/session-helpers";
import { readBoundSessionRole } from "../../../../../lib/session-role-access";
import { getPreferences } from "../../../../../lib/services/preference-service";
import type { Role } from "../../../../../lib/types/preference";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const viewerRole = readBoundSessionRole(id, request.headers.get("cookie"));

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
      session.status === "fallback_pending" ||
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
        retryState: await buildRetryState(session, viewerRole),
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

async function buildRetryState(
  session: Awaited<ReturnType<typeof getSession>>,
  viewerRole: Role | null,
) {
  if (!session) {
    return undefined;
  }

  if (
    session.status !== "retry_pending" &&
    session.status !== "reranking" &&
    session.status !== "fallback_pending"
  ) {
    return undefined;
  }

  if (!viewerRole || !session.retryInitiatorRole) {
    return undefined;
  }

  const viewerHasConfirmed =
    viewerRole === "a"
      ? (session.retryAConfirmedAt ?? null) !== null
      : (session.retryBConfirmedAt ?? null) !== null;
  const partnerHasConfirmed =
    viewerRole === "a"
      ? (session.retryBConfirmedAt ?? null) !== null
      : (session.retryAConfirmedAt ?? null) !== null;
  const preferences = await getPreferences(session.id);
  const viewerPreference = preferences.find(
    (preference) => preference.role === viewerRole,
  );

  return {
    initiatorRole: session.retryInitiatorRole,
    viewerRole,
    viewerHasConfirmed,
    partnerHasConfirmed,
    initiatedByPartner: session.retryInitiatorRole !== viewerRole,
    viewerPreferences: viewerPreference
      ? {
          categories: [...viewerPreference.categories],
          budget: viewerPreference.budget,
        }
      : undefined,
  };
}

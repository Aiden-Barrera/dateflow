import { NextResponse } from "next/server";
import { getSession } from "../../../../lib/services/session-service";
import { isExpired } from "../../../../lib/services/session-helpers";
import { serializeSession } from "../../../../lib/services/session-serializer";

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/sessions/[id]
 *
 * Retrieves a session by ID. Returns:
 * - 200 with the session if found and active
 * - 404 if the session doesn't exist
 * - 410 if the session has expired
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;

  try {
    const session = await getSession(id);

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    const isTerminal = session.status === "matched" || session.status === "expired";
    if (session.status === "expired" || (!isTerminal && isExpired(session))) {
      return NextResponse.json(
        { error: "This session has expired" },
        { status: 410 }
      );
    }

    return NextResponse.json({ session: serializeSession(session) });
  } catch (err) {
    console.error(`[GET /api/sessions/${id}] Failed:`, err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

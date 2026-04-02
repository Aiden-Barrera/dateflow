import { NextResponse } from "next/server";
import { serializeMatchResult } from "../../../../../lib/services/result-serializer";
import { getMatchResult } from "../../../../../lib/services/result-service";

type RouteParams = {
  params: Promise<{ id: string }>;
};

function validateSessionId(id: string): string {
  const trimmed = id.trim();

  if (trimmed.length === 0) {
    throw new Error("Session ID is required");
  }

  return trimmed;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;

  try {
    const sessionId = validateSessionId(id);
    const matchResult = await getMatchResult(sessionId);

    return NextResponse.json({
      matchResult: serializeMatchResult(matchResult),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";

    if (message === "Session ID is required") {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    if (
      message === "Session not found" ||
      message === "Matched venue not found"
    ) {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    if (
      message === "Session is not matched" ||
      message === "Session does not have a matched venue"
    ) {
      return NextResponse.json({ error: message }, { status: 409 });
    }

    console.error(`[GET /api/sessions/${id}/result] Failed:`, err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}

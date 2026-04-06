import { NextResponse } from "next/server";
import { verifyQstashRequest } from "../../../../../lib/qstash";
import { getSession } from "../../../../../lib/services/session-service";
import { generateVenues } from "../../../../../lib/services/venue-generation-service";

type RouteParams = {
  params: Promise<{ id: string }>;
};

type GenerateBody = {
  sessionId?: string;
};

function isDependencyFailure(message: string): boolean {
  return (
    message.includes("GOOGLE_PLACES_API_KEY") ||
    message.includes("Google Places API error") ||
    message.includes("QSTASH")
  );
}

export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;

  try {
    const isAuthorized = await verifyQstashRequest(request.clone());
    if (!isAuthorized) {
      console.warn(`[POST /api/sessions/${id}/generate] QStash authorization failed`, {
        hasUpstashSignature: Boolean(request.headers.get("Upstash-Signature")),
        upstashRegion: request.headers.get("Upstash-Region"),
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: GenerateBody;
    try {
      body = (await request.json()) as GenerateBody;
    } catch {
      return NextResponse.json(
        { error: "Request body must be valid JSON" },
        { status: 400 }
      );
    }

    if (body.sessionId && body.sessionId !== id) {
      return NextResponse.json(
        { error: "Session ID mismatch" },
        { status: 400 }
      );
    }

    const session = await getSession(id);
    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    if (session.status !== "both_ready" && session.status !== "generation_failed") {
      return NextResponse.json(
        { error: "Session is not ready for venue generation" },
        { status: 400 }
      );
    }

    await generateVenues(id);

    return NextResponse.json({ status: "generating" }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";

    if (isDependencyFailure(message)) {
      console.error(
        `[POST /api/sessions/${id}/generate] Dependency failure:`,
        err,
      );

      return NextResponse.json(
        {
          error:
            "We couldn't finish venue generation right now. Please retry shortly.",
          retryable: true,
        },
        { status: 503 },
      );
    }

    console.error(`[POST /api/sessions/${id}/generate] Failed:`, err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

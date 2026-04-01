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

export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;

  try {
    const isAuthorized = await verifyQstashRequest(request.clone());
    if (!isAuthorized) {
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

    return NextResponse.json({ status: "generating" }, { status: 202 });
  } catch (err) {
    console.error(`[POST /api/sessions/${id}/generate] Failed:`, err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

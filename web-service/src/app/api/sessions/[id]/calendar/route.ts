import { NextResponse } from "next/server";
import { generateICS } from "../../../../../lib/services/calendar-export-service";
import { getMatchResult } from "../../../../../lib/services/result-service";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;

  try {
    // Time resolution (scheduledAt → confirmedDateTime → fallback) happens
    // inside generateICS; the route just supplies the enriched MatchResult.
    const matchResult = await getMatchResult(id);
    const ics = generateICS(matchResult);

    return new NextResponse(ics, {
      status: 200,
      headers: {
        "content-type": "text/calendar; charset=utf-8",
        "content-disposition": 'attachment; filename="dateflow-plan.ics"',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";

    if (message === "Session not found") {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    if (message === "Session is not matched") {
      return NextResponse.json({ error: message }, { status: 409 });
    }

    console.error(`[GET /api/sessions/${id}/calendar] Failed:`, err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}

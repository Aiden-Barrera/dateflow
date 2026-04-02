import { NextResponse } from "next/server";
import { generateICS } from "../../../../../lib/services/calendar-export-service";
import { getMatchResult } from "../../../../../lib/services/result-service";

type RouteParams = {
  params: Promise<{ id: string }>;
};

function parseDateTime(value: string | null): Date | undefined {
  if (value === null) {
    return undefined;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("dateTime must be a valid ISO 8601 string");
  }

  return date;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;

  try {
    const url = new URL(request.url);
    const dateTime = parseDateTime(url.searchParams.get("dateTime"));
    const matchResult = await getMatchResult(id);
    const ics = generateICS(matchResult, dateTime);

    return new NextResponse(ics, {
      status: 200,
      headers: {
        "content-type": "text/calendar; charset=utf-8",
        "content-disposition": 'attachment; filename="dateflow-plan.ics"',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";

    if (message === "dateTime must be a valid ISO 8601 string") {
      return NextResponse.json({ error: message }, { status: 400 });
    }

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

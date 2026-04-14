import { NextResponse } from "next/server";
import { getSupabaseClient } from "../../../../lib/supabase";
import { getHistory } from "../../../../lib/services/session-history-service";

function parsePositiveInteger(
  value: string | null,
  fallback: number,
  fieldName: "page" | "pageSize",
): number {
  if (value === null) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${fieldName} must be a positive integer`);
  }

  return parsed;
}

function getBearerToken(header: string | null): string {
  if (!header) {
    throw new Error("Authorization header is required");
  }

  if (!header.startsWith("Bearer ")) {
    throw new Error("Authorization header must use Bearer token");
  }

  return header.slice("Bearer ".length).trim();
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const token = getBearerToken(request.headers.get("authorization"));
    const page = parsePositiveInteger(url.searchParams.get("page"), 1, "page");
    const pageSize = parsePositiveInteger(
      url.searchParams.get("pageSize"),
      10,
      "pageSize",
    );

    if (pageSize > 50) {
      return NextResponse.json(
        { error: "pageSize must be between 1 and 50" },
        { status: 400 },
      );
    }

    const includeAll = url.searchParams.get("includeAll") === "true";
    const supabase = getSupabaseClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const history = await getHistory(user.id, page, pageSize, includeAll);
    return NextResponse.json(history);
  } catch (err) {
    const message = err instanceof Error ? err.message : "";

    if (
      message === "Authorization header is required" ||
      message === "Authorization header must use Bearer token" ||
      message === "page must be a positive integer" ||
      message === "pageSize must be a positive integer"
    ) {
      const status = message.startsWith("Authorization") ? 401 : 400;
      return NextResponse.json({ error: message }, { status });
    }

    console.error("[GET /api/sessions/history] Failed:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}

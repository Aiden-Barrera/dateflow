import { NextResponse } from "next/server";
import { expireStaleSessions } from "../../../../lib/services/session-service";

function hasValidCronToken(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return false;
  }

  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!hasValidCronToken(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const expiredCount = await expireStaleSessions();
    return NextResponse.json({ expiredCount });
  } catch (error) {
    console.error("[GET /api/cron/expire-sessions] Failed:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}

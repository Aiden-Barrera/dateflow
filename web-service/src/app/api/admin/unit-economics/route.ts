import { NextResponse } from "next/server";
import {
  getUnitEconomicsSnapshot,
  listUnitEconomicsSnapshots,
} from "@/lib/services/unit-economics-service";

function hasValidInternalToken(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return false;
  }

  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!hasValidInternalToken(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (sessionId) {
      const snapshot = await getUnitEconomicsSnapshot(sessionId);
      return NextResponse.json({ snapshot });
    }

    const snapshots = await listUnitEconomicsSnapshots();
    return NextResponse.json({ snapshots });
  } catch (error) {
    console.error("[GET /api/admin/unit-economics] Failed:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}

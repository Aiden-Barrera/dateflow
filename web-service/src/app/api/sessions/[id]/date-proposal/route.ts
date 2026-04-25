/**
 * POST /api/sessions/[id]/date-proposal
 *
 * Handles two actions (DS-07D):
 *
 *   propose  — One user proposes a day/time. Broadcasts a `date_proposed`
 *              event on the Supabase realtime channel so the partner sees it
 *              immediately without a page refresh.
 *
 *   confirm  — Both users have agreed. Writes `confirmed_date_time` to the
 *              sessions table and broadcasts a `date_confirmed` event so both
 *              UIs unlock the "Add to Calendar" button.
 */

import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../../lib/supabase-server";
import {
  confirmDate,
  getDateProposalChannelName,
} from "../../../../../lib/services/date-proposal-service";
import type {
  DateProposedEvent,
  DateConfirmedEvent,
} from "../../../../../lib/services/date-proposal-service";

type RouteParams = { params: Promise<{ id: string }> };

const ISO_8601_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

// Day → a rough UTC hour mapping so we can build an ISO string from day+slot.
const DAY_OFFSETS: Record<string, number> = {
  monday: 1, tuesday: 2, wednesday: 3, thursday: 4,
  friday: 5, saturday: 6, sunday: 0,
};

const TIME_TO_UTC_OFFSET: Record<string, number> = {
  "6:00 PM": 18, "6:30 PM": 18, "7:00 PM": 19, "7:30 PM": 19,
  "8:00 PM": 20, "8:30 PM": 20, "9:00 PM": 21,
};

const TIME_TO_MINUTES: Record<string, number> = {
  "6:00 PM": 0, "6:30 PM": 30, "7:00 PM": 0, "7:30 PM": 30,
  "8:00 PM": 0, "8:30 PM": 30, "9:00 PM": 0,
};

function buildDateTimeISO(day: string, timeSlot: string): string {
  // Build a representative ISO string for the next occurrence of `day` at `timeSlot`.
  // Exact date is best-effort; confirmed_date_time stores the real value after confirmation.
  const now = new Date();
  const dayOffset = (DAY_OFFSETS[day.toLowerCase()] ?? 0) - now.getUTCDay();
  const daysUntil = ((dayOffset + 7) % 7) || 7;
  const target = new Date(now);
  target.setUTCDate(target.getUTCDate() + daysUntil);
  target.setUTCHours(TIME_TO_UTC_OFFSET[timeSlot] ?? 19, TIME_TO_MINUTES[timeSlot] ?? 0, 0, 0);
  return target.toISOString();
}

export async function POST(request: Request, { params }: RouteParams) {
  const { id: sessionId } = await params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { action } = body;

  if (action === "propose") {
    const { proposedBy, day, time } = body as {
      proposedBy?: string;
      day?: string;
      time?: string;
    };

    if (
      (proposedBy !== "a" && proposedBy !== "b") ||
      typeof day !== "string" ||
      typeof time !== "string"
    ) {
      return NextResponse.json(
        { error: "proposedBy ('a'|'b'), day, and time are required" },
        { status: 400 },
      );
    }

    try {
      const dateTime = buildDateTimeISO(day, time);
      const event: DateProposedEvent = {
        type: "date_proposed",
        proposedBy,
        dateTime,
      };

      await getSupabaseServerClient()
        .channel(getDateProposalChannelName(sessionId))
        .send({ type: "broadcast", event: "date_proposal", payload: event });

      return NextResponse.json({ ok: true, dateTime });
    } catch (err) {
      console.error(`[POST /api/sessions/${sessionId}/date-proposal] propose failed:`, err);
      return NextResponse.json(
        { error: "Something went wrong. Please try again." },
        { status: 500 },
      );
    }
  }

  if (action === "confirm") {
    const { confirmedAt } = body as { confirmedAt?: string };

    if (!confirmedAt || !ISO_8601_RE.test(confirmedAt)) {
      return NextResponse.json(
        { error: "confirmedAt must be a valid ISO 8601 string" },
        { status: 400 },
      );
    }

    try {
      const confirmedDate = new Date(confirmedAt);
      await confirmDate(sessionId, confirmedDate);

      const event: DateConfirmedEvent = {
        type: "date_confirmed",
        confirmedAt,
      };

      await getSupabaseServerClient()
        .channel(getDateProposalChannelName(sessionId))
        .send({ type: "broadcast", event: "date_proposal", payload: event });

      return NextResponse.json({ ok: true });
    } catch (err) {
      console.error(`[POST /api/sessions/${sessionId}/date-proposal] confirm failed:`, err);
      return NextResponse.json(
        { error: "Something went wrong. Please try again." },
        { status: 500 },
      );
    }
  }

  return NextResponse.json(
    { error: "action must be 'propose' or 'confirm'" },
    { status: 400 },
  );
}

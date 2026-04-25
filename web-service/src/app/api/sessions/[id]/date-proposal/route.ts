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
 *
 * Access is role-bound: the caller must have a valid session-role cookie and
 * proposedBy must match their bound role.
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
import { readBoundSessionRole } from "../../../../../lib/session-role-access";
import type { DayOfWeek } from "../../../../../lib/types/preference";

type RouteParams = { params: Promise<{ id: string }> };

const ISO_8601_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

// ─── Allowlists ───────────────────────────────────────────────────────────────

const VALID_DAYS = new Set<DayOfWeek>(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]);
const VALID_TIME_SLOTS = new Set([
  "6:00 PM", "6:30 PM", "7:00 PM", "7:30 PM", "8:00 PM", "8:30 PM", "9:00 PM",
]);

// DayOfWeek abbreviation → UTC day-of-week number (0 = Sun)
const DAY_OFFSETS: Record<DayOfWeek, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
};

const TIME_TO_UTC_HOUR: Record<string, number> = {
  "6:00 PM": 18, "6:30 PM": 18, "7:00 PM": 19, "7:30 PM": 19,
  "8:00 PM": 20, "8:30 PM": 20, "9:00 PM": 21,
};

const TIME_TO_MINUTES: Record<string, number> = {
  "6:00 PM": 0, "6:30 PM": 30, "7:00 PM": 0, "7:30 PM": 30,
  "8:00 PM": 0, "8:30 PM": 30, "9:00 PM": 0,
};

function buildDateTimeISO(day: DayOfWeek, timeSlot: string): string {
  // Build the next occurrence of `day` at `timeSlot` (UTC).
  const now = new Date();
  const targetDayNum = DAY_OFFSETS[day];
  const daysUntil = (targetDayNum - now.getUTCDay() + 7) % 7;
  const target = new Date(now);
  target.setUTCDate(target.getUTCDate() + daysUntil);
  target.setUTCHours(TIME_TO_UTC_HOUR[timeSlot] ?? 19, TIME_TO_MINUTES[timeSlot] ?? 0, 0, 0);

  // If daysUntil === 0 (today) and the time has already passed, advance by 7 days.
  if (daysUntil === 0 && target <= now) {
    target.setUTCDate(target.getUTCDate() + 7);
  }

  return target.toISOString();
}

export async function POST(request: Request, { params }: RouteParams) {
  const { id: sessionId } = await params;

  // ── Auth: require a bound session-role cookie ────────────────────────────
  const boundRole = readBoundSessionRole(sessionId, request.headers.get("cookie"));
  if (!boundRole) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { action } = body;

  // ── propose ───────────────────────────────────────────────────────────────
  if (action === "propose") {
    const { proposedBy, day, time } = body as {
      proposedBy?: string;
      day?: string;
      time?: string;
    };

    if (proposedBy !== boundRole) {
      return NextResponse.json(
        { error: "proposedBy must match your session role" },
        { status: 403 },
      );
    }

    if (!day || !VALID_DAYS.has(day as DayOfWeek)) {
      return NextResponse.json(
        { error: `day must be one of: ${[...VALID_DAYS].join(", ")}` },
        { status: 400 },
      );
    }

    if (!time || !VALID_TIME_SLOTS.has(time)) {
      return NextResponse.json(
        { error: `time must be one of: ${[...VALID_TIME_SLOTS].join(", ")}` },
        { status: 400 },
      );
    }

    try {
      const dateTime = buildDateTimeISO(day as DayOfWeek, time);
      const event: DateProposedEvent = {
        type: "date_proposed",
        proposedBy: proposedBy as "a" | "b",
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

  // ── confirm ───────────────────────────────────────────────────────────────
  if (action === "confirm") {
    const { confirmedAt } = body as { confirmedAt?: string };

    if (!confirmedAt || !ISO_8601_RE.test(confirmedAt)) {
      return NextResponse.json(
        { error: "confirmedAt must be a valid ISO 8601 string" },
        { status: 400 },
      );
    }

    const confirmedDate = new Date(confirmedAt);
    if (Number.isNaN(confirmedDate.getTime())) {
      return NextResponse.json(
        { error: "confirmedAt must be a valid ISO 8601 string" },
        { status: 400 },
      );
    }

    try {
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

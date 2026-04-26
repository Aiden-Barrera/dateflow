/**
 * Shared date-resolution utilities for the date-proposal flow (DS-07D).
 *
 * Both the server-side route (POST /api/sessions/[id]/date-proposal) and the
 * client-side DateTimePlanner chip labels MUST use these functions so the
 * displayed chip date and the proposed datetime always refer to the same
 * calendar day.
 *
 * Rule: all date math is done in UTC. Chip labels are also formatted in UTC
 * (timeZone: "UTC") so they match the stored ISO string regardless of the
 * viewer's local timezone.
 */

import type { DayOfWeek } from "./types/preference";

// ─── Constants ────────────────────────────────────────────────────────────────

export const DAY_OFFSETS: Record<DayOfWeek, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
};

export const TIME_SLOTS = [
  "6:00 PM",
  "6:30 PM",
  "7:00 PM",
  "7:30 PM",
  "8:00 PM",
  "8:30 PM",
  "9:00 PM",
] as const;

export type TimeSlot = (typeof TIME_SLOTS)[number];

const TIME_TO_UTC_HOUR: Record<string, number> = {
  "6:00 PM": 18, "6:30 PM": 18, "7:00 PM": 19, "7:30 PM": 19,
  "8:00 PM": 20, "8:30 PM": 20, "9:00 PM": 21,
};

const TIME_TO_MINUTES: Record<string, number> = {
  "6:00 PM": 0, "6:30 PM": 30, "7:00 PM": 0, "7:30 PM": 30,
  "8:00 PM": 0, "8:30 PM": 30, "9:00 PM": 0,
};

// ─── Core resolution function ─────────────────────────────────────────────────

/**
 * Returns the canonical UTC Date for a given DayOfWeek + time-slot pair.
 *
 * Algorithm (matches what the server stores):
 *  1. Find the next occurrence of `day` in UTC (0 days ahead = today UTC).
 *  2. Set the UTC hour/minute from the time slot.
 *  3. If that lands on today UTC and the time has already passed, advance
 *     by 7 days so the date is always in the future.
 *
 * Passing a custom `now` is supported for testing.
 */
export function resolveProposalDate(
  day: DayOfWeek,
  time: string,
  now: Date = new Date(),
): Date {
  const targetDayNum = DAY_OFFSETS[day];
  const daysUntil = (targetDayNum - now.getUTCDay() + 7) % 7;

  const target = new Date(now);
  target.setUTCDate(target.getUTCDate() + daysUntil);
  target.setUTCHours(
    TIME_TO_UTC_HOUR[time] ?? 19,
    TIME_TO_MINUTES[time] ?? 0,
    0,
    0,
  );

  // If today (UTC) is the target day but the slot has already passed, push to
  // next week so we never propose a time in the past.
  if (daysUntil === 0 && target <= now) {
    target.setUTCDate(target.getUTCDate() + 7);
  }

  return target;
}

/**
 * Convenience wrapper: resolves and returns an ISO 8601 string.
 * Used by the server route to build the broadcast payload.
 */
export function buildDateTimeISO(day: DayOfWeek, time: string): string {
  return resolveProposalDate(day, time).toISOString();
}

/**
 * Formats a DayOfWeek chip label using the same UTC date the server will
 * resolve to. Uses the earliest available time slot (6:00 PM) as the
 * reference — only the date portion matters for the label.
 *
 * Example output: "Friday, April 25"
 */
export function formatDayChipLabel(day: DayOfWeek): string {
  // Use the earliest slot to get the resolved date. If today is that day and
  // 6 PM UTC hasn't passed yet, this returns today; otherwise it returns next
  // week. Either way it matches what the server will store.
  const date = resolveProposalDate(day, "6:00 PM");
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC", // Must match the server — show the UTC calendar date.
  });
}

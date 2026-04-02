import type { MatchResult } from "../types/match-result";

const DEFAULT_EVENT_HOUR_UTC = 19;
const EVENT_DURATION_HOURS = 2;

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

function formatICSDate(date: Date): string {
  return (
    `${date.getUTCFullYear()}` +
    `${pad(date.getUTCMonth() + 1)}` +
    `${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}` +
    `${pad(date.getUTCMinutes())}` +
    `${pad(date.getUTCSeconds())}Z`
  );
}

function defaultDateTime(matchResult: MatchResult): Date {
  const nextDay = new Date(matchResult.matchedAt);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  nextDay.setUTCHours(DEFAULT_EVENT_HOUR_UTC, 0, 0, 0);
  return nextDay;
}

function escapeICS(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export function generateICS(
  matchResult: MatchResult,
  dateTime = defaultDateTime(matchResult),
): string {
  const endDateTime = new Date(dateTime);
  endDateTime.setUTCHours(endDateTime.getUTCHours() + EVENT_DURATION_HOURS);

  const resultUrl = `https://dateflow.app/plan/${matchResult.sessionId}/results`;

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Dateflow//EN",
    "BEGIN:VEVENT",
    `DTSTART:${formatICSDate(dateTime)}`,
    `DTEND:${formatICSDate(endDateTime)}`,
    `SUMMARY:${escapeICS(`Date at ${matchResult.venue.name}`)}`,
    `LOCATION:${escapeICS(matchResult.venue.address)}`,
    `DESCRIPTION:${escapeICS(`Planned with Dateflow - ${resultUrl}`)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

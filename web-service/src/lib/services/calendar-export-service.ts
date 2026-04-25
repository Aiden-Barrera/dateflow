import type { MatchResult } from "../types/match-result";

const DEFAULT_EVENT_HOUR_UTC = 19;
const DEFAULT_DURATION_MINUTES = 120;
const DEFAULT_APP_URL = "https://dateflow.app";
const GOOGLE_MAPS_BASE = "https://maps.google.com/?q=";

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

function fallbackDateTime(matchResult: MatchResult): Date {
  const nextDay = new Date(matchResult.matchedAt);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  nextDay.setUTCHours(DEFAULT_EVENT_HOUR_UTC, 0, 0, 0);
  return nextDay;
}

/**
 * Resolves the event start time using the priority order:
 * 1. Explicit override (legacy `dateTime` param — backward compat)
 * 2. venue.scheduledAt  — live event, exact time already known
 * 3. matchResult.confirmedDateTime — both users agreed on a static venue time
 * 4. 7 PM next day     — fallback when no schedule data is available
 */
function resolveStartTime(
  matchResult: MatchResult,
  override: Date | undefined,
): Date {
  if (override) return override;
  if (matchResult.venue.scheduledAt) return matchResult.venue.scheduledAt;
  if (matchResult.confirmedDateTime) return matchResult.confirmedDateTime;
  return fallbackDateTime(matchResult);
}

function resolveEndTime(startTime: Date, durationMinutes: number | undefined): Date {
  const end = new Date(startTime);
  const minutes = durationMinutes ?? DEFAULT_DURATION_MINUTES;
  end.setUTCMinutes(end.getUTCMinutes() + minutes);
  return end;
}

/**
 * Resolves the URL to embed in the ICS:
 * - Live events → Ticketmaster event page (eventUrl)
 * - Static venues → Google Maps search for the address
 */
function resolveEventUrl(matchResult: MatchResult): string {
  if (matchResult.venue.eventUrl) return matchResult.venue.eventUrl;
  return `${GOOGLE_MAPS_BASE}${encodeURIComponent(matchResult.venue.address)}`;
}

function escapeICS(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function getResultsUrl(sessionId: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? DEFAULT_APP_URL;
  return `${appUrl}/plan/${sessionId}/results`;
}

export function generateICS(
  matchResult: MatchResult,
  dateTime?: Date,
): string {
  const startTime = resolveStartTime(matchResult, dateTime);
  const endTime = resolveEndTime(startTime, matchResult.venue.durationMinutes);
  const eventUrl = resolveEventUrl(matchResult);
  const resultUrl = getResultsUrl(matchResult.sessionId);
  const uid = `${matchResult.sessionId}@dateflow.app`;

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Dateflow//EN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${formatICSDate(matchResult.matchedAt)}`,
    `DTSTART:${formatICSDate(startTime)}`,
    `DTEND:${formatICSDate(endTime)}`,
    `SUMMARY:${escapeICS(`Date at ${matchResult.venue.name}`)}`,
    `LOCATION:${escapeICS(matchResult.venue.address)}`,
    `DESCRIPTION:${escapeICS(`Planned with Dateflow - ${resultUrl}`)}`,
    `URL:${eventUrl}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

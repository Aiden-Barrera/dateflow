import type { Venue, VenueRow } from "./venue";
import { toVenue } from "./venue";

export type MatchResult = {
  readonly sessionId: string;
  readonly venue: Venue;
  readonly matchedAt: Date;
  /** Set when both users confirm a meeting time for a static venue (DS-07D). */
  readonly confirmedDateTime?: Date | null;
};

export type MatchResultRow = {
  readonly session_id: string;
  readonly matched_at: string;
} & VenueRow;

export function toMatchResult(row: MatchResultRow): MatchResult {
  return {
    sessionId: row.session_id,
    venue: toVenue(row),
    matchedAt: new Date(row.matched_at),
  };
}

import type { MatchResult } from "../types/match-result";
import type { Venue } from "../types/venue";

export type SerializedVenue = {
  readonly id: string;
  readonly sessionId: string;
  readonly placeId: string;
  readonly name: string;
  readonly category: Venue["category"];
  readonly address: string;
  readonly lat: number;
  readonly lng: number;
  readonly priceLevel: number;
  readonly rating: number;
  readonly photoUrl: string | null;
  readonly tags: readonly string[];
  readonly round: number;
  readonly position: number;
  readonly score: Venue["score"];
};

export type SerializedMatchResult = {
  readonly sessionId: string;
  readonly venue: SerializedVenue;
  readonly matchedAt: string;
};

export function serializeMatchResult(
  matchResult: MatchResult,
): SerializedMatchResult {
  return {
    sessionId: matchResult.sessionId,
    venue: matchResult.venue,
    matchedAt: matchResult.matchedAt.toISOString(),
  };
}

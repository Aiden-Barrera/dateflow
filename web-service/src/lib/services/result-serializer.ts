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
  readonly photoUrls: readonly string[];
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
  const { venue } = matchResult;

  return {
    sessionId: matchResult.sessionId,
    venue: {
      id: venue.id,
      sessionId: venue.sessionId,
      placeId: venue.placeId,
      name: venue.name,
      category: venue.category,
      address: venue.address,
      lat: venue.lat,
      lng: venue.lng,
      priceLevel: venue.priceLevel,
      rating: venue.rating,
      photoUrls: [...venue.photoUrls],
      photoUrl: venue.photoUrl,
      tags: [...venue.tags],
      round: venue.round,
      position: venue.position,
      score: venue.score,
    },
    matchedAt: matchResult.matchedAt.toISOString(),
  };
}

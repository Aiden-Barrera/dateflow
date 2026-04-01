import type { Preference, Category, Location } from "../types/preference";
import type {
  CuratedVenueCandidate,
  PlaceCandidate,
  VenueScore,
} from "../types/venue";
import { computeVenueComposite } from "../types/venue";
import { mapGoogleTypeToCategory } from "./places-api-client";
import { distanceBetween } from "./midpoint-calculator";
import { scoreSafety } from "./safety-filter";

const REVIEW_COUNT_CAP = 500;

function roundBonus(category: Category, round: number): number {
  if (round === 2 && (category === "ACTIVITY" || category === "EVENT")) {
    return 0.15;
  }

  if (round === 3 && (category === "ACTIVITY" || category === "BAR")) {
    return 0.05;
  }

  return 0;
}

function categoryOverlapScore(
  category: Category,
  preferences: readonly [Preference, Preference]
): number {
  const [a, b] = preferences;
  const aHas = a.categories.includes(category);
  const bHas = b.categories.includes(category);

  if (aHas && bHas) return 1;
  if (aHas || bHas) return 0.6;
  return 0.2;
}

function distanceScore(candidate: PlaceCandidate, midpoint: Location): number {
  const meters = distanceBetween(candidate.location, midpoint);
  return Math.max(0, 1 - meters / 5_000);
}

function qualitySignal(candidate: PlaceCandidate): number {
  const ratingScore = candidate.rating / 5;
  const clampedReviews = Math.max(1, Math.min(candidate.reviewCount, REVIEW_COUNT_CAP));
  const reviewScore = Math.log(clampedReviews) / Math.log(REVIEW_COUNT_CAP);
  return ratingScore * 0.6 + reviewScore * 0.4;
}

function timeOfDayFit(category: Category, round: number): number {
  if (round === 1) {
    return category === "RESTAURANT" || category === "BAR" ? 1 : 0.6;
  }

  if (round === 2) {
    return category === "ACTIVITY" || category === "EVENT" ? 1 : 0.7;
  }

  return 0.9;
}

function buildFallbackTags(category: Category, candidate: PlaceCandidate): readonly string[] {
  const tags = ["unscored"];

  if (candidate.rating >= 4.5) {
    tags.push("top-rated");
  }

  if (candidate.reviewCount >= 250) {
    tags.push("well-reviewed");
  }

  tags.push(category.toLowerCase());
  return tags;
}

function fallbackRank(
  candidates: readonly PlaceCandidate[],
  preferences: readonly [Preference, Preference],
  round: number,
  midpoint: Location
): readonly CuratedVenueCandidate[] {
  return candidates
    .map((candidate) => {
      const category = mapGoogleTypeToCategory(candidate.types);
      const partialScore = {
        categoryOverlap: categoryOverlapScore(category, preferences),
        distanceToMidpoint: distanceScore(candidate, midpoint),
        firstDateSuitability: scoreSafety(candidate),
        qualitySignal: qualitySignal(candidate),
        timeOfDayFit: timeOfDayFit(category, round),
      };

      const baseComposite = computeVenueComposite(partialScore);
      const score: VenueScore = {
        ...partialScore,
        composite: baseComposite,
      };

      const rankingComposite = Math.min(1, baseComposite + roundBonus(category, round));

      return {
        rankingComposite,
        ...candidate,
        category,
        score,
        tags: buildFallbackTags(category, candidate),
      };
    })
    .sort((a, b) => b.rankingComposite - a.rankingComposite)
    .map((rankedCandidate) => {
      const { rankingComposite, ...candidate } = rankedCandidate;
      void rankingComposite;
      return candidate;
    });
}

export async function scoreAndCurate(
  candidates: readonly PlaceCandidate[],
  preferences: readonly [Preference, Preference],
  round: number,
  midpoint: Location
): Promise<readonly CuratedVenueCandidate[]> {
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

  if (!anthropicApiKey) {
    return fallbackRank(candidates, preferences, round, midpoint);
  }

  try {
    // DS-03 guarantees fallback behavior even when AI is unavailable.
    // The live Anthropic call can be layered in without changing callers.
    return fallbackRank(candidates, preferences, round, midpoint);
  } catch (err) {
    console.error("[scoreAndCurate] Anthropic scoring failed, using fallback:", err);
    return fallbackRank(candidates, preferences, round, midpoint);
  }
}

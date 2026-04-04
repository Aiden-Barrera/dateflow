import type { Venue } from "../../../../lib/types/venue";
import type { BudgetLevel } from "../../../../lib/types/preference";

export function resolveFallbackVenue(
  matchedVenueId: string | null,
  venues: readonly Venue[],
): Venue | null {
  if (!matchedVenueId) {
    return null;
  }

  return venues.find((venue) => venue.id === matchedVenueId) ?? null;
}

export function buildFallbackExplanation(venue: Venue): string {
  return `${venue.name} stayed closest to both of your shared preferences, with a strong quality signal and an easier midpoint for meeting up.`;
}

export function buildInitialRetryPreferences(venue: Venue): {
  readonly categories: readonly [Venue["category"]];
  readonly budget: BudgetLevel;
} {
  return {
    categories: [venue.category],
    budget: mapPriceLevelToBudget(venue.priceLevel),
  };
}

function mapPriceLevelToBudget(priceLevel: number): BudgetLevel {
  if (priceLevel <= 1) {
    return "BUDGET";
  }

  if (priceLevel >= 4) {
    return "UPSCALE";
  }

  return "MODERATE";
}

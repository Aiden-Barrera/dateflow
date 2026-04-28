import { getSupabaseServerClient } from "../supabase-server";

type SponsoredVenueRow = {
  readonly place_id: string;
  readonly boost: number;
};

/**
 * Fetches active sponsored boosts for a set of place IDs.
 *
 * Returns a Map<placeId, boost> for any place that currently has an active
 * sponsorship campaign. Used by the venue scorer to add a paid placement
 * signal — similar to how Uber Eats surfaces promoted restaurants higher.
 *
 * Venues without an active row receive no boost (missing from the map).
 * Campaign dates (campaign_start / campaign_end) are enforced via SQL so the
 * scorer doesn't need to handle time logic.
 */
export async function fetchActiveSponsoredBoosts(
  placeIds: readonly string[],
): Promise<ReadonlyMap<string, number>> {
  if (placeIds.length === 0) {
    return new Map();
  }

  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("sponsored_venues")
    .select("place_id, boost")
    .eq("active", true)
    .or(
      "campaign_start.is.null,campaign_start.lte.now()",
    )
    .or(
      "campaign_end.is.null,campaign_end.gte.now()",
    )
    .in("place_id", [...placeIds]);

  if (error) {
    // Sponsored boosts are non-critical — a DB hiccup should not block
    // generation. Log and return an empty map so scoring continues normally.
    console.error("[fetchActiveSponsoredBoosts] Failed to fetch boosts:", error);
    return new Map();
  }

  return new Map(
    ((data ?? []) as SponsoredVenueRow[]).map((row) => [row.place_id, row.boost]),
  );
}

/**
 * Fetches cross-session popularity boosts for a set of place IDs.
 *
 * Returns a Map<placeId, popularity_boost> read from the pre-computed
 * `popularity_boost` column on the venues table. The nightly analytics job
 * refreshes this from `venue_global_like_rates`.
 *
 * Returns empty map on error — popularity is a nice-to-have signal.
 */
export async function fetchPopularityBoosts(
  placeIds: readonly string[],
): Promise<ReadonlyMap<string, number>> {
  if (placeIds.length === 0) {
    return new Map();
  }

  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("venues")
    .select("place_id, popularity_boost")
    .in("place_id", [...placeIds])
    .gt("popularity_boost", 0);

  if (error) {
    console.error("[fetchPopularityBoosts] Failed to fetch popularity boosts:", error);
    return new Map();
  }

  return new Map(
    ((data ?? []) as Array<{ place_id: string; popularity_boost: number }>)
      .map((row) => [row.place_id, row.popularity_boost]),
  );
}

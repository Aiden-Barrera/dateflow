import type { BudgetLevel, Category } from "../types/preference";
import type {
  GenerationStrategy,
  SessionCandidatePoolItemRow,
  SessionCandidatePoolRow,
  SessionCandidatePoolItem,
} from "../types/candidate-pool";
import { toSessionCandidatePoolItem } from "../types/candidate-pool";
import { getSupabaseServerClient } from "../supabase-server";
import { getBothPreferences } from "./preference-service";
import { calculateMidpoint } from "./midpoint-calculator";
import { buildDeterministicRanking } from "./ai-curation-service";
import type { Category as PreferenceCategory, Preference } from "../types/preference";
import type { CuratedVenueCandidate, PlaceCandidate } from "../types/venue";

export type RetryPreferencesInput = {
  readonly categories: readonly Category[];
  readonly budget: BudgetLevel;
  readonly radiusMeters?: number;
};

export type RetryPreferences = {
  readonly categories: readonly Category[];
  readonly budget: BudgetLevel;
  readonly radiusMeters: number | null;
};

export type VenueRetryResult = {
  readonly strategy: GenerationStrategy;
  readonly generationBatchId: string;
  readonly surfacedCycle: number;
  readonly venueIds: readonly string[];
  readonly requiresFullRegeneration: boolean;
};

export function buildRetryPreferences(
  input: RetryPreferencesInput,
): RetryPreferences {
  return {
    categories: [...input.categories],
    budget: input.budget,
    radiusMeters: input.radiusMeters ?? null,
  };
}

export function selectRetryCandidates(
  candidates: readonly SessionCandidatePoolItem[],
  surfacedPlaceIds: readonly string[],
): readonly SessionCandidatePoolItem[] {
  const surfaced = new Set(surfacedPlaceIds);
  const unsurfacedCandidates = candidates.filter(
    (candidate) => !surfaced.has(candidate.placeId),
  );

  return unsurfacedCandidates.slice(0, 12);
}

type SurfacedVenueHistoryRow = {
  readonly place_id: string;
  readonly surfaced_cycle: number;
};

type InsertVenueRow = {
  readonly session_id: string;
  readonly place_id: string;
  readonly name: string;
  readonly category: PreferenceCategory;
  readonly address: string;
  readonly lat: number;
  readonly lng: number;
  readonly price_level: number;
  readonly rating: number;
  readonly photo_urls: readonly string[];
  readonly photo_url: string | null;
  readonly tags: readonly string[];
  readonly round: number;
  readonly position: number;
  readonly score_category_overlap: number;
  readonly score_distance_to_midpoint: number;
  readonly score_first_date_suitability: number;
  readonly score_quality_signal: number;
  readonly score_time_of_day_fit: number;
  readonly generation_batch_id: string;
  readonly surfaced_cycle: number;
};

type RetryVenueCandidate = PlaceCandidate &
  Partial<CuratedVenueCandidate> & {
    readonly photoUrls: readonly string[];
    readonly photoUrl: string | null;
  };

export async function rerankStoredCandidates(
  sessionId: string,
  input: RetryPreferencesInput,
): Promise<VenueRetryResult> {
  const retryPreferences = buildRetryPreferences(input);
  const preferences = applyRetryPreferences(
    await getBothPreferences(sessionId),
    retryPreferences,
  );
  const midpoint = calculateMidpoint(
    preferences[0].location,
    preferences[1].location,
  );
  const latestPoolId = await getLatestPoolId(sessionId);
  const poolItems = await getPoolItems(latestPoolId);
  const surfacedHistory = await getSurfacedHistory(sessionId);
  const nextSurfacedCycle = getNextSurfacedCycle(surfacedHistory);
  const selectedCandidates = selectRetryCandidates(
    poolItems,
    surfacedHistory.map((venue) => venue.place_id),
  );

  if (selectedCandidates.length < 12) {
    return {
      strategy: "full_regeneration",
      generationBatchId: "",
      surfacedCycle: nextSurfacedCycle,
      venueIds: [],
      requiresFullRegeneration: true,
    };
  }

  const generationBatchId = await createGenerationBatch(
    sessionId,
    latestPoolId,
    nextSurfacedCycle,
    "pool_rerank",
  );

  const venueRows = await buildSurfacedVenueRows(
    sessionId,
    generationBatchId,
    nextSurfacedCycle,
    selectedCandidates,
    preferences,
    midpoint,
  );

  await insertVenues(venueRows);

  return {
    strategy: "pool_rerank",
    generationBatchId,
    surfacedCycle: nextSurfacedCycle,
    venueIds: venueRows.map((venue) => venue.place_id),
    requiresFullRegeneration: false,
  };
}

async function getLatestPoolId(sessionId: string): Promise<string> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("session_candidate_pools")
    .select("*")
    .eq("session_id", sessionId);

  if (error) {
    throw new Error(error.message);
  }

  const pools = (data ?? []) as SessionCandidatePoolRow[];
  const latestPool = [...pools].sort(
    (left, right) =>
      new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
  )[0];

  if (!latestPool) {
    throw new Error(`No candidate pool found for session ${sessionId}`);
  }

  return latestPool.id;
}

async function getPoolItems(poolId: string): Promise<readonly SessionCandidatePoolItem[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("session_candidate_pool_items")
    .select("*")
    .eq("pool_id", poolId);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as SessionCandidatePoolItemRow[])
    .sort((left, right) => left.source_rank - right.source_rank)
    .map(toSessionCandidatePoolItem);
}

async function getSurfacedHistory(
  sessionId: string,
): Promise<readonly SurfacedVenueHistoryRow[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("venues")
    .select("*")
    .eq("session_id", sessionId);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as SurfacedVenueHistoryRow[];
}

function getNextSurfacedCycle(
  surfacedHistory: readonly SurfacedVenueHistoryRow[],
): number {
  const latestSurfacedCycle = surfacedHistory.reduce(
    (max, venue) => Math.max(max, venue.surfaced_cycle),
    0,
  );

  return latestSurfacedCycle + 1;
}

function applyRetryPreferences(
  preferences: readonly [Preference, Preference],
  retryPreferences: RetryPreferences,
): readonly [Preference, Preference] {
  const [preferenceA, preferenceB] = preferences;

  return [
    {
      ...preferenceA,
      budget: retryPreferences.budget,
      categories: retryPreferences.categories,
    },
    {
      ...preferenceB,
      budget: retryPreferences.budget,
      categories: retryPreferences.categories,
    },
  ];
}

async function createGenerationBatch(
  sessionId: string,
  poolId: string,
  batchNumber: number,
  generationStrategy: GenerationStrategy,
): Promise<string> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("venue_generation_batches")
    .insert({
      session_id: sessionId,
      pool_id: poolId,
      batch_number: batchNumber,
      generation_strategy: generationStrategy,
    })
    .select("id")
    .single<{ id: string }>();

  if (error) {
    throw new Error(error.message);
  }

  return data.id;
}

async function buildSurfacedVenueRows(
  sessionId: string,
  generationBatchId: string,
  surfacedCycle: number,
  candidates: readonly SessionCandidatePoolItem[],
  preferences: readonly [Preference, Preference],
  midpoint: Preference["location"],
): Promise<readonly InsertVenueRow[]> {
  const placeCandidates = candidates.map(toPlaceCandidate);
  const selectedRows: InsertVenueRow[] = [];
  let remaining = [...placeCandidates];

  for (const round of [1, 2, 3] as const) {
    const curated = buildDeterministicRanking(
      remaining,
      preferences,
      round,
      midpoint,
    );
    const roundPicks = curated.slice(0, 4);
    const venuePhotosByPlaceId = new Map(
      remaining.map((candidate) => [
        candidate.placeId,
        {
          primary: candidate.photoUrl,
          all: candidate.photoUrls,
        },
      ]),
    );

    roundPicks.forEach((venue, index) => {
      const venuePhotos = venuePhotosByPlaceId.get(venue.placeId);

      selectedRows.push({
        session_id: sessionId,
        place_id: venue.placeId,
        name: venue.name,
        category: venue.category,
        address: venue.address,
        lat: venue.location.lat,
        lng: venue.location.lng,
        price_level: venue.priceLevel === 0 ? 1 : venue.priceLevel,
        rating: venue.rating,
        photo_urls: venuePhotos?.all ?? [],
        photo_url: venuePhotos?.primary ?? null,
        tags: venue.tags,
        round,
        position: index + 1,
        score_category_overlap: venue.score.categoryOverlap,
        score_distance_to_midpoint: venue.score.distanceToMidpoint,
        score_first_date_suitability: venue.score.firstDateSuitability,
        score_quality_signal: venue.score.qualitySignal,
        score_time_of_day_fit: venue.score.timeOfDayFit,
        generation_batch_id: generationBatchId,
        surfaced_cycle: surfacedCycle,
      });
    });

    const usedIds = new Set(roundPicks.map((venue) => venue.placeId));
    remaining = remaining.filter((venue) => !usedIds.has(venue.placeId));
  }

  return selectedRows;
}

function toPlaceCandidate(
  candidate: SessionCandidatePoolItem,
): RetryVenueCandidate {
  return {
    placeId: candidate.placeId,
    name: candidate.name,
    address: candidate.address,
    location: {
      lat: candidate.lat,
      lng: candidate.lng,
      label: candidate.name,
    },
    types: candidate.rawTypes,
    primaryType: null,
    priceLevel: candidate.priceLevel,
    rating: candidate.rating,
    reviewCount: 250,
    photoReferences: [],
    photoReference: null,
    photoUrls: candidate.photoUrls,
    photoUrl: candidate.photoUrl,
    category: candidate.category,
    tags: candidate.rawTags,
    score: {
      categoryOverlap: 0,
      distanceToMidpoint: 0,
      firstDateSuitability: 0,
      qualitySignal: 0,
      timeOfDayFit: 0,
      composite: 0,
    },
  };
}

async function insertVenues(rows: readonly InsertVenueRow[]): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("venues")
    .upsert(rows, { onConflict: "session_id,round,position" });

  if (error) {
    throw new Error(error.message);
  }
}

import type { Category } from "./preference";

export type CandidatePoolSource = "initial_generation" | "full_regeneration";
export type GenerationStrategy =
  | "initial_pool_rank"
  | "pool_rerank"
  | "full_regeneration";

export type SessionCandidatePool = {
  readonly id: string;
  readonly sessionId: string;
  readonly source: CandidatePoolSource;
  readonly createdAt: Date;
};

export type SessionCandidatePoolItem = {
  readonly id: string;
  readonly poolId: string;
  readonly placeId: string;
  readonly name: string;
  readonly category: Category;
  readonly address: string;
  readonly lat: number;
  readonly lng: number;
  readonly priceLevel: number;
  readonly rating: number;
  readonly photoUrls: readonly string[];
  readonly photoUrl: string | null;
  readonly rawTypes: readonly string[];
  readonly rawTags: readonly string[];
  readonly sourceRank: number;
  readonly createdAt: Date;
};

export type GenerationBatch = {
  readonly id: string;
  readonly sessionId: string;
  readonly poolId: string;
  readonly batchNumber: number;
  readonly generationStrategy: GenerationStrategy;
  readonly createdAt: Date;
};

export type SessionCandidatePoolRow = {
  readonly id: string;
  readonly session_id: string;
  readonly source: CandidatePoolSource;
  readonly created_at: string;
};

export type SessionCandidatePoolItemRow = {
  readonly id: string;
  readonly pool_id: string;
  readonly place_id: string;
  readonly name: string;
  readonly category: Category;
  readonly address: string;
  readonly lat: number;
  readonly lng: number;
  readonly price_level: number;
  readonly rating: number;
  readonly photo_urls?: string[] | null;
  readonly photo_url: string | null;
  readonly raw_types: string[];
  readonly raw_tags: string[];
  readonly source_rank: number;
  readonly created_at: string;
};

export type GenerationBatchRow = {
  readonly id: string;
  readonly session_id: string;
  readonly pool_id: string;
  readonly batch_number: number;
  readonly generation_strategy: GenerationStrategy;
  readonly created_at: string;
};

function normalizePhotoUrl(photoUrl: string): string {
  if (photoUrl.startsWith("/")) {
    return photoUrl;
  }

  try {
    const parsed = new URL(photoUrl);

    if (parsed.pathname === "/api/places/photos") {
      return `${parsed.pathname}${parsed.search}`;
    }
  } catch {
    return photoUrl;
  }

  return photoUrl;
}

export function toSessionCandidatePool(
  row: SessionCandidatePoolRow,
): SessionCandidatePool {
  return {
    id: row.id,
    sessionId: row.session_id,
    source: row.source,
    createdAt: new Date(row.created_at),
  };
}

function resolvePhotoUrls(
  row: Pick<SessionCandidatePoolItemRow, "photo_url" | "photo_urls">,
): readonly string[] {
  if (Array.isArray(row.photo_urls) && row.photo_urls.length > 0) {
    return row.photo_urls.map(normalizePhotoUrl);
  }

  return row.photo_url ? [normalizePhotoUrl(row.photo_url)] : [];
}

export function toSessionCandidatePoolItem(
  row: SessionCandidatePoolItemRow,
): SessionCandidatePoolItem {
  const photoUrls = resolvePhotoUrls(row);

  return {
    id: row.id,
    poolId: row.pool_id,
    placeId: row.place_id,
    name: row.name,
    category: row.category,
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    priceLevel: row.price_level,
    rating: row.rating,
    photoUrls,
    photoUrl: photoUrls[0] ?? null,
    rawTypes: row.raw_types,
    rawTags: row.raw_tags,
    sourceRank: row.source_rank,
    createdAt: new Date(row.created_at),
  };
}

export function toGenerationBatch(row: GenerationBatchRow): GenerationBatch {
  return {
    id: row.id,
    sessionId: row.session_id,
    poolId: row.pool_id,
    batchNumber: row.batch_number,
    generationStrategy: row.generation_strategy,
    createdAt: new Date(row.created_at),
  };
}

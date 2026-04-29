import { getSupabaseServerClient } from "../supabase-server";

const UNIT_ECONOMICS_TABLE = "unit_economics_snapshots";

const COST_ESTIMATES_CENTS = {
  placesSearchRequest: 2,
  placesPhotoRequest: 1,
  aiRequest: 3,
  infraActiveSession: 1,
} as const;

type UnitEconomicsSnapshotRow = {
  readonly session_id: string;
  readonly places_search_requests: number;
  readonly places_photo_requests: number;
  readonly ai_requests: number;
  readonly ai_input_tokens: number;
  readonly ai_output_tokens: number;
  readonly places_search_cost_cents: number;
  readonly places_photo_cost_cents: number;
  readonly ai_cost_cents: number;
  readonly infra_cost_cents: number;
  readonly acquisition_cost_cents: number | null;
  readonly revenue_cents: number;
  readonly gross_margin_cents: number;
  readonly last_computed_at: string;
};

export type UnitEconomicsSnapshot = {
  readonly sessionId: string;
  readonly placesSearchRequests: number;
  readonly placesPhotoRequests: number;
  readonly aiRequests: number;
  readonly aiInputTokens: number;
  readonly aiOutputTokens: number;
  readonly placesSearchCostCents: number;
  readonly placesPhotoCostCents: number;
  readonly aiCostCents: number;
  readonly infraCostCents: number;
  readonly acquisitionCostCents: number | null;
  readonly revenueCents: number;
  readonly grossMarginCents: number;
  readonly lastComputedAt: string;
};

type SnapshotDelta = {
  readonly placesSearchRequests?: number;
  readonly placesPhotoRequests?: number;
  readonly aiRequests?: number;
  readonly aiInputTokens?: number;
  readonly aiOutputTokens?: number;
};

type ListSnapshotOptions = {
  readonly limit?: number;
};

function buildDefaultSnapshot(sessionId: string): UnitEconomicsSnapshot {
  return {
    sessionId,
    placesSearchRequests: 0,
    placesPhotoRequests: 0,
    aiRequests: 0,
    aiInputTokens: 0,
    aiOutputTokens: 0,
    placesSearchCostCents: 0,
    placesPhotoCostCents: 0,
    aiCostCents: 0,
    infraCostCents: 0,
    acquisitionCostCents: null,
    revenueCents: 0,
    grossMarginCents: 0,
    lastComputedAt: new Date(0).toISOString(),
  };
}

function fromRow(row: UnitEconomicsSnapshotRow): UnitEconomicsSnapshot {
  return {
    sessionId: row.session_id,
    placesSearchRequests: row.places_search_requests,
    placesPhotoRequests: row.places_photo_requests,
    aiRequests: row.ai_requests,
    aiInputTokens: row.ai_input_tokens,
    aiOutputTokens: row.ai_output_tokens,
    placesSearchCostCents: row.places_search_cost_cents,
    placesPhotoCostCents: row.places_photo_cost_cents,
    aiCostCents: row.ai_cost_cents,
    infraCostCents: row.infra_cost_cents,
    acquisitionCostCents: row.acquisition_cost_cents,
    revenueCents: row.revenue_cents,
    grossMarginCents: row.gross_margin_cents,
    lastComputedAt: row.last_computed_at,
  };
}

function toRow(snapshot: UnitEconomicsSnapshot): UnitEconomicsSnapshotRow {
  return {
    session_id: snapshot.sessionId,
    places_search_requests: snapshot.placesSearchRequests,
    places_photo_requests: snapshot.placesPhotoRequests,
    ai_requests: snapshot.aiRequests,
    ai_input_tokens: snapshot.aiInputTokens,
    ai_output_tokens: snapshot.aiOutputTokens,
    places_search_cost_cents: snapshot.placesSearchCostCents,
    places_photo_cost_cents: snapshot.placesPhotoCostCents,
    ai_cost_cents: snapshot.aiCostCents,
    infra_cost_cents: snapshot.infraCostCents,
    acquisition_cost_cents: snapshot.acquisitionCostCents,
    revenue_cents: snapshot.revenueCents,
    gross_margin_cents: snapshot.grossMarginCents,
    last_computed_at: snapshot.lastComputedAt,
  };
}

function recomputeSnapshot(
  current: UnitEconomicsSnapshot,
  delta: SnapshotDelta,
): UnitEconomicsSnapshot {
  const placesSearchRequests = current.placesSearchRequests + (delta.placesSearchRequests ?? 0);
  const placesPhotoRequests = current.placesPhotoRequests + (delta.placesPhotoRequests ?? 0);
  const aiRequests = current.aiRequests + (delta.aiRequests ?? 0);
  const aiInputTokens = current.aiInputTokens + (delta.aiInputTokens ?? 0);
  const aiOutputTokens = current.aiOutputTokens + (delta.aiOutputTokens ?? 0);
  const placesSearchCostCents =
    placesSearchRequests * COST_ESTIMATES_CENTS.placesSearchRequest;
  const placesPhotoCostCents =
    placesPhotoRequests * COST_ESTIMATES_CENTS.placesPhotoRequest;
  const aiCostCents = aiRequests * COST_ESTIMATES_CENTS.aiRequest;
  const infraCostCents =
    placesSearchRequests > 0 || placesPhotoRequests > 0 || aiRequests > 0
      ? COST_ESTIMATES_CENTS.infraActiveSession
      : current.infraCostCents;
  const totalCostCents =
    placesSearchCostCents +
    placesPhotoCostCents +
    aiCostCents +
    infraCostCents +
    (current.acquisitionCostCents ?? 0);

  return {
    ...current,
    placesSearchRequests,
    placesPhotoRequests,
    aiRequests,
    aiInputTokens,
    aiOutputTokens,
    placesSearchCostCents,
    placesPhotoCostCents,
    aiCostCents,
    infraCostCents,
    grossMarginCents: current.revenueCents - totalCostCents,
    lastComputedAt: new Date().toISOString(),
  };
}

async function selectSnapshot(sessionId: string): Promise<UnitEconomicsSnapshot> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from(UNIT_ECONOMICS_TABLE)
    .select()
    .eq("session_id", sessionId)
    .single<UnitEconomicsSnapshotRow>();

  if (error) {
    if (error.code === "PGRST116") {
      return buildDefaultSnapshot(sessionId);
    }
    throw new Error(error.message);
  }

  return fromRow(data);
}

async function upsertSnapshot(snapshot: UnitEconomicsSnapshot): Promise<UnitEconomicsSnapshot> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from(UNIT_ECONOMICS_TABLE)
    .upsert(toRow(snapshot), { onConflict: "session_id" })
    .select()
    .single<UnitEconomicsSnapshotRow>();

  if (error) {
    throw new Error(error.message);
  }

  return fromRow(data);
}

export async function getUnitEconomicsSnapshot(
  sessionId: string,
): Promise<UnitEconomicsSnapshot> {
  return selectSnapshot(sessionId);
}

export async function recordPlacesSearchUsage(
  sessionId: string,
  requestCount = 1,
): Promise<UnitEconomicsSnapshot> {
  const current = await selectSnapshot(sessionId);
  return upsertSnapshot(
    recomputeSnapshot(current, { placesSearchRequests: requestCount }),
  );
}

export async function recordPlacesPhotoUsage(
  sessionId: string,
  requestCount = 1,
): Promise<UnitEconomicsSnapshot> {
  const current = await selectSnapshot(sessionId);
  return upsertSnapshot(
    recomputeSnapshot(current, { placesPhotoRequests: requestCount }),
  );
}

export async function recordAiUsage(
  sessionId: string,
  usage: {
    readonly requestCount?: number;
    readonly inputTokens?: number;
    readonly outputTokens?: number;
  },
): Promise<UnitEconomicsSnapshot> {
  const current = await selectSnapshot(sessionId);
  return upsertSnapshot(
    recomputeSnapshot(current, {
      aiRequests: usage.requestCount ?? 1,
      aiInputTokens: usage.inputTokens ?? 0,
      aiOutputTokens: usage.outputTokens ?? 0,
    }),
  );
}

export async function listUnitEconomicsSnapshots(
  options: ListSnapshotOptions = {},
): Promise<readonly UnitEconomicsSnapshot[]> {
  const supabase = getSupabaseServerClient();
  const limit = options.limit ?? 20;
  const { data, error } = await supabase
    .from(UNIT_ECONOMICS_TABLE)
    .select()
    .order("last_computed_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (data as UnitEconomicsSnapshotRow[]).map(fromRow);
}
